import type { ScriptPackage, StoryBible } from "@jubensha/dsl";
import type { CreationOrchestrator, GenerateStoryBibleResult } from "./creation-orchestrator.js";
import { QualityGate, type QualityGateReport } from "./quality-gate.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";
import type { CriticDiagnostic } from "./story-critic-agent.js";
import {
  DEFAULT_MAX_REPAIR_ATTEMPTS,
  compileReviewAndRepair,
} from "./script-repair-runner.js";
import type { ScriptRepairAgent, ScriptRepairAttempt } from "./script-repair-agent.js";

export type ScriptCreationPipelineStage =
  | "received_brief"
  | "planning_story"
  | "criticizing_story"
  | "compiling_draft"
  | "deterministic_review"
  | "ready_for_review"
  | "blocked"
  | "failed";

export interface ScriptCreationPipelineDiagnostic {
  readonly severity: "info" | "warning" | "error";
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly stage: ScriptCreationPipelineStage;
}

export interface ScriptCreationInputSummary {
  readonly title?: string;
  readonly premise: string;
  readonly playerCount: number;
  readonly genre?: string;
}

export interface ScriptCreationQualityReport {
  readonly readyForPublish: boolean;
  readonly diagnostics: readonly ScriptCreationPipelineDiagnostic[];
  readonly summary: {
    readonly errors: number;
    readonly warnings: number;
    readonly info: number;
  };
  readonly report: QualityGateReport;
}

export interface ScriptCreationDraftResult {
  readonly scriptPackageDraft: ScriptPackage;
  readonly qualityReport: ScriptCreationQualityReport;
  readonly readyForPublish: boolean;
}

export interface ScriptCreationPipelineInput {
  readonly brief: StoryPlannerInput;
  readonly runId?: string;
}

export interface ScriptCreationPipelineResult {
  readonly runId: string;
  readonly inputSummary: ScriptCreationInputSummary;
  readonly stage: ScriptCreationPipelineStage;
  readonly status: ScriptCreationPipelineStage;
  readonly readyForPublish: boolean;
  readonly errors: readonly ScriptCreationPipelineDiagnostic[];
  readonly storyBible?: StoryBible;
  readonly storyAttempts?: GenerateStoryBibleResult["attempts"];
  readonly criticDiagnostics?: readonly CriticDiagnostic[];
  readonly scriptPackageDraft?: ScriptPackage;
  readonly qualityReport?: ScriptCreationQualityReport;
  readonly draftResult?: ScriptCreationDraftResult;
  readonly repairAttempts?: readonly ScriptRepairAttempt[];
  readonly maxRepairAttempts?: number;
  readonly repairAttempted?: boolean;
  readonly repairSucceeded?: boolean;
}

export interface ScriptCreationQualityReviewer {
  reviewPackage(scriptPackage: ScriptPackage): ScriptCreationQualityReport;
}

export interface ScriptCreationPipelineOptions {
  readonly orchestrator: Pick<CreationOrchestrator, "generateStoryBible">;
  readonly qualityReviewer?: ScriptCreationQualityReviewer;
  readonly repairAgent?: ScriptRepairAgent;
  readonly maxRepairAttempts?: number;
  readonly runIdGenerator?: () => string;
}

interface PipelineContext {
  readonly runId: string;
  readonly inputSummary: ScriptCreationInputSummary;
}

export class ScriptCreationPipeline {
  private readonly orchestrator: Pick<CreationOrchestrator, "generateStoryBible">;
  private readonly qualityReviewer: ScriptCreationQualityReviewer;
  private readonly repairAgent: ScriptRepairAgent | undefined;
  private readonly maxRepairAttempts: number;
  private readonly runIdGenerator: () => string;

  constructor(options: ScriptCreationPipelineOptions) {
    this.orchestrator = options.orchestrator;
    this.qualityReviewer = options.qualityReviewer ?? new DeterministicQualityReviewer();
    this.repairAgent = options.repairAgent;
    this.maxRepairAttempts = options.maxRepairAttempts ?? DEFAULT_MAX_REPAIR_ATTEMPTS;
    this.runIdGenerator = options.runIdGenerator ?? (() => crypto.randomUUID());
  }

  async run(input: ScriptCreationPipelineInput): Promise<ScriptCreationPipelineResult> {
    const context = createContext(input, this.runIdGenerator);

    try {
      return await this.runCheckedPipeline(input.brief, context);
    } catch (error) {
      return failedResult(context, toErrorDiagnostic(error, "planning_story"), this.maxRepairAttempts);
    }
  }

  private async runCheckedPipeline(
    brief: StoryPlannerInput,
    context: PipelineContext,
  ): Promise<ScriptCreationPipelineResult> {
    const storyResult = await this.orchestrator.generateStoryBible(brief);
    const storyBible = storyResult.storyBible;
    const storyAttempts = storyResult.attempts;
    const criticDiagnostics = storyResult.criticDiagnostics;
    const criticErrors = criticDiagnostics.flatMap(toCriticError);

    if (criticErrors.length > 0) {
      return blockedResult(context, this.maxRepairAttempts, storyBible, storyAttempts, criticDiagnostics, criticErrors);
    }

    return this.compileAndReview(brief, context, storyBible, storyAttempts, criticDiagnostics);
  }

  private async compileAndReview(
    brief: StoryPlannerInput,
    context: PipelineContext,
    storyBible: StoryBible,
    storyAttempts: GenerateStoryBibleResult["attempts"],
    criticDiagnostics: readonly CriticDiagnostic[],
  ): Promise<ScriptCreationPipelineResult> {
    const outcome = await compileReviewAndRepair({
      brief,
      inputSummary: context.inputSummary,
      storyBible,
      criticDiagnostics,
      qualityReviewer: this.qualityReviewer,
      ...optionalField("repairAgent", this.repairAgent),
      maxRepairAttempts: this.maxRepairAttempts,
    });

    if (outcome.kind === "reviewed") {
      return reviewedResult(context, outcome.storyBible, storyAttempts, criticDiagnostics, outcome.scriptPackageDraft, outcome.qualityReport, outcome.repairAttempts, this.maxRepairAttempts);
    }

    return failedResult(context, outcome.error, this.maxRepairAttempts, outcome.storyBible, storyAttempts, criticDiagnostics, outcome.repairAttempts);
  }
}

class DeterministicQualityReviewer implements ScriptCreationQualityReviewer {
  private readonly qualityGate = new QualityGate();

  reviewPackage(scriptPackage: ScriptPackage): ScriptCreationQualityReport {
    const review = this.qualityGate.reviewPackage(scriptPackage);
    const diagnostics = review.diagnostics.map(toDeterministicDiagnostic);

    return { ...review, diagnostics, readyForPublish: review.readyForPublish && hasNoErrors(diagnostics) };
  }
}

function createContext(
  input: ScriptCreationPipelineInput,
  runIdGenerator: () => string,
): PipelineContext {
  return {
    runId: input.runId ?? runIdGenerator(),
    inputSummary: summarizeBrief(input.brief),
  };
}

function summarizeBrief(brief: StoryPlannerInput): ScriptCreationInputSummary {
  return {
    ...optionalField("title", brief.title),
    premise: brief.premise,
    playerCount: brief.playerCount,
    ...optionalField("genre", brief.genre),
  };
}

function optionalField<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}

function reviewedResult(
  context: PipelineContext,
  storyBible: StoryBible,
  storyAttempts: GenerateStoryBibleResult["attempts"],
  criticDiagnostics: readonly CriticDiagnostic[],
  scriptPackageDraft: ScriptPackage,
  qualityReport: ScriptCreationQualityReport,
  repairAttempts: readonly ScriptRepairAttempt[] = [],
  maxRepairAttempts = DEFAULT_MAX_REPAIR_ATTEMPTS,
): ScriptCreationPipelineResult {
  const errors = qualityReport.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  const readyForPublish = qualityReport.readyForPublish && errors.length === 0;
  const status = readyForPublish ? "ready_for_review" : "blocked";
  const draftResult = { scriptPackageDraft, qualityReport, readyForPublish };

  return { ...context, stage: status, status, readyForPublish, errors, storyBible, storyAttempts, criticDiagnostics, scriptPackageDraft, qualityReport, draftResult, ...repairMeta(repairAttempts, maxRepairAttempts, readyForPublish) };
}

function blockedResult(
  context: PipelineContext,
  maxRepairAttempts: number,
  storyBible: StoryBible,
  storyAttempts: GenerateStoryBibleResult["attempts"],
  criticDiagnostics: readonly CriticDiagnostic[],
  errors: readonly ScriptCreationPipelineDiagnostic[],
): ScriptCreationPipelineResult {
  return { ...context, stage: "blocked", status: "blocked", readyForPublish: false, errors, storyBible, storyAttempts, criticDiagnostics, ...repairMeta([], maxRepairAttempts, false) };
}

function failedResult(
  context: PipelineContext,
  error: ScriptCreationPipelineDiagnostic,
  maxRepairAttempts: number,
  storyBible?: StoryBible,
  storyAttempts?: GenerateStoryBibleResult["attempts"],
  criticDiagnostics?: readonly CriticDiagnostic[],
  repairAttempts: readonly ScriptRepairAttempt[] = [],
): ScriptCreationPipelineResult {
  return {
    ...context,
    stage: "failed",
    status: "failed",
    readyForPublish: false,
    errors: [error],
    ...optionalField("storyBible", storyBible),
    ...optionalField("storyAttempts", storyAttempts),
    ...optionalField("criticDiagnostics", criticDiagnostics),
    ...repairMeta(repairAttempts, maxRepairAttempts, false),
  };
}

function repairMeta(
  repairAttempts: readonly ScriptRepairAttempt[],
  maxRepairAttempts: number,
  readyForPublish: boolean,
) {
  return {
    repairAttempts,
    maxRepairAttempts,
    repairAttempted: repairAttempts.length > 0,
    repairSucceeded: readyForPublish && repairAttempts.some((attempt) => attempt.status === "applied"),
  };
}

function toCriticError(diagnostic: CriticDiagnostic): readonly ScriptCreationPipelineDiagnostic[] {
  if (diagnostic.severity !== "error") {
    return [];
  }

  return [{ ...diagnostic, severity: "error", code: `critic.${diagnostic.code}`, stage: "criticizing_story" }];
}

function toDeterministicDiagnostic(diagnostic: {
  readonly severity: "info" | "warning" | "error";
  readonly code: string;
  readonly path: string;
  readonly message: string;
}): ScriptCreationPipelineDiagnostic {
  return { ...diagnostic, stage: "deterministic_review" };
}

function toErrorDiagnostic(
  error: unknown,
  stage: ScriptCreationPipelineStage,
): ScriptCreationPipelineDiagnostic {
  return {
    severity: "error",
    code: stage === "compiling_draft" ? "compiler_error" : "pipeline_error",
    path: stage === "compiling_draft" ? "scriptPackageDraft" : "$",
    message: error instanceof Error ? error.message : "Script creation pipeline failed",
    stage,
  };
}

function hasNoErrors(diagnostics: readonly ScriptCreationPipelineDiagnostic[]): boolean {
  return diagnostics.every((diagnostic) => diagnostic.severity !== "error");
}

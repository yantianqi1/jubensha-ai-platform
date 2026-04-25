import type { ScriptPackage, StoryBible } from "@jubensha/dsl";
import { compileStoryBibleToScriptPackage } from "./story-bible-to-script-compiler.js";
import type { CriticDiagnostic } from "./story-critic-agent.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";
import type {
  ScriptCreationInputSummary,
  ScriptCreationPipelineDiagnostic,
  ScriptCreationQualityReport,
  ScriptCreationQualityReviewer,
} from "./script-creation-pipeline.js";
import type { ScriptRepairAgent, ScriptRepairAttempt, ScriptRepairStage } from "./script-repair-agent.js";

export const DEFAULT_MAX_REPAIR_ATTEMPTS = 1;

export type CompileRepairOutcome = ReviewOutcome | FailureOutcome;

interface ReviewOutcome {
  readonly kind: "reviewed";
  readonly storyBible: StoryBible;
  readonly scriptPackageDraft: ScriptPackage;
  readonly qualityReport: ScriptCreationQualityReport;
  readonly repairAttempts: readonly ScriptRepairAttempt[];
}

interface FailureOutcome {
  readonly kind: "failed";
  readonly storyBible: StoryBible;
  readonly error: ScriptCreationPipelineDiagnostic;
  readonly repairAttempts: readonly ScriptRepairAttempt[];
}

export interface CompileRepairInput {
  readonly brief: StoryPlannerInput;
  readonly inputSummary: ScriptCreationInputSummary;
  readonly storyBible: StoryBible;
  readonly criticDiagnostics: readonly CriticDiagnostic[];
  readonly qualityReviewer: ScriptCreationQualityReviewer;
  readonly repairAgent?: ScriptRepairAgent;
  readonly maxRepairAttempts: number;
}

interface CompileReviewState {
  readonly storyBible: StoryBible;
  readonly repairAttempts: readonly ScriptRepairAttempt[];
}

export async function compileReviewAndRepair(input: CompileRepairInput): Promise<CompileRepairOutcome> {
  return runRepairableCompileReview(input, { storyBible: input.storyBible, repairAttempts: [] });
}

async function runRepairableCompileReview(
  input: CompileRepairInput,
  state: CompileReviewState,
): Promise<CompileRepairOutcome> {
  const result = compileAndReview(state.storyBible, input.qualityReviewer);

  if (result.kind === "reviewed" && result.qualityReport.readyForPublish) {
    return { ...result, storyBible: state.storyBible, repairAttempts: state.repairAttempts };
  }

  if (!shouldRepair(input, state.repairAttempts)) {
    return attachAttempts(result, state);
  }

  const stage = result.kind === "failed" ? "compiler" : "quality_gate";
  const diagnostics = result.kind === "failed" ? [result.error] : result.qualityReport.diagnostics;
  const repair = await runRepairAttempt(input, state, stage, diagnostics);
  const nextAttempts = [...state.repairAttempts, repair];

  if (repair.status !== "applied" || !repair.repairedStoryBible) {
    return attachAttempts(result, { ...state, repairAttempts: nextAttempts });
  }

  return runRepairableCompileReview(input, { storyBible: repair.repairedStoryBible, repairAttempts: nextAttempts });
}

function compileAndReview(
  storyBible: StoryBible,
  qualityReviewer: ScriptCreationQualityReviewer,
): Omit<ReviewOutcome, "storyBible" | "repairAttempts"> | Omit<FailureOutcome, "storyBible" | "repairAttempts"> {
  try {
    const scriptPackageDraft = compileStoryBibleToScriptPackage(storyBible);
    const qualityReport = qualityReviewer.reviewPackage(scriptPackageDraft);
    return { kind: "reviewed", scriptPackageDraft, qualityReport };
  } catch (error) {
    return { kind: "failed", error: toCompilerError(error) };
  }
}

async function runRepairAttempt(
  input: CompileRepairInput,
  state: CompileReviewState,
  stage: ScriptRepairStage,
  diagnostics: readonly ScriptCreationPipelineDiagnostic[],
): Promise<ScriptRepairAttempt> {
  try {
    const result = await input.repairAgent?.repairStoryBible({
      brief: input.brief,
      currentStoryBible: state.storyBible,
      criticDiagnostics: input.criticDiagnostics,
      qualityDiagnostics: stage === "quality_gate" ? diagnostics : [],
      ...optionalCompilerError(stage === "compiler" ? diagnostics[0] : undefined),
      previousAttempts: state.repairAttempts,
    });

    if (!result) return createAttempt(input, state, stage, diagnostics, "skipped", "repair agent is not configured");
    return createAttempt(input, state, stage, [...diagnostics, ...result.diagnostics], "applied", undefined, result.repairedStoryBible);
  } catch (error) {
    return createAttempt(input, state, stage, diagnostics, "failed", readReason(error));
  }
}

function createAttempt(
  input: CompileRepairInput,
  state: CompileReviewState,
  stage: ScriptRepairStage,
  diagnostics: readonly ScriptCreationPipelineDiagnostic[],
  status: ScriptRepairAttempt["status"],
  reason?: string,
  repairedStoryBible?: StoryBible,
): ScriptRepairAttempt {
  return {
    attemptNumber: state.repairAttempts.length + 1,
    stage,
    sourceIssueCodes: diagnostics.map((diagnostic) => diagnostic.code),
    inputSummary: input.inputSummary,
    diagnostics,
    status,
    ...optionalReason(reason),
    ...optionalStoryBible(repairedStoryBible),
  };
}

function shouldRepair(input: CompileRepairInput, attempts: readonly ScriptRepairAttempt[]): boolean {
  return Boolean(input.repairAgent) && attempts.length < input.maxRepairAttempts;
}

function attachAttempts(
  result: ReturnType<typeof compileAndReview>,
  state: CompileReviewState,
): CompileRepairOutcome {
  return { ...result, storyBible: state.storyBible, repairAttempts: state.repairAttempts };
}

function toCompilerError(error: unknown): ScriptCreationPipelineDiagnostic {
  return {
    severity: "error",
    code: "compiler_error",
    path: "scriptPackageDraft",
    message: error instanceof Error ? error.message : "ScriptPackage compiler failed",
    stage: "compiling_draft",
  };
}

function readReason(error: unknown): string {
  return error instanceof Error ? error.message : "Script repair failed";
}

function optionalCompilerError(error: ScriptCreationPipelineDiagnostic | undefined) {
  return error ? { compilerError: error } : {};
}

function optionalStoryBible(storyBible: StoryBible | undefined) {
  return storyBible ? { repairedStoryBible: storyBible } : {};
}

function optionalReason(reason: string | undefined) {
  return reason ? { reason } : {};
}

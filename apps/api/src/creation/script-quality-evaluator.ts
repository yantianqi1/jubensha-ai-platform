import type { GenerationJobRecord } from "./generation-job-model.js";
import type {
  ScriptCreationPipelineDiagnostic,
  ScriptCreationPipelineResult,
  ScriptCreationPipelineStage,
} from "./script-creation-pipeline.js";
import type { CriticDiagnostic } from "./story-critic-agent.js";

export type ScriptQualityEvaluationReadiness = "ready_for_review" | "blocked" | "failed";
export type ScriptQualityEvaluationStage = "brief" | "planner" | "critic" | "compiler" | "quality_gate" | "content_draft";
export type ScriptQualityEvaluationSeverity = "info" | "warning" | "error";

export interface ScriptQualityEvaluationIssue {
  readonly code: string;
  readonly severity: ScriptQualityEvaluationSeverity;
  readonly stage: ScriptQualityEvaluationStage;
  readonly path?: string;
  readonly message: string;
}

export interface ScriptQualityEvaluationReport {
  readonly passed: boolean;
  readonly score: number;
  readonly readiness: ScriptQualityEvaluationReadiness;
  readonly storyBibleScore: number;
  readonly compileScore: number;
  readonly deterministicScore: number;
  readonly issueSummary: { readonly errors: number; readonly warnings: number; readonly info: number };
  readonly repairAttemptCount: number;
  readonly repairSucceeded: boolean;
  readonly repairIssueSummary: { readonly errors: number; readonly warnings: number; readonly info: number };
  readonly issues: readonly ScriptQualityEvaluationIssue[];
  readonly artifacts: {
    readonly storyBiblePresent: boolean;
    readonly scriptPackageDraftPresent: boolean;
    readonly draftPackageIdPresent: boolean;
    readonly readyForPublish: boolean;
  };
}

export interface EvaluateScriptCreationPipelineOptions {
  readonly draftPackageId?: string | null;
}

export function evaluateGenerationJobRecord(job: GenerationJobRecord): ScriptQualityEvaluationReport {
  if (!job.pipelineResult) {
    return evaluateMissingPipelineResult(job);
  }

  return evaluateScriptCreationPipelineResult(job.pipelineResult, { draftPackageId: job.draftPackageId });
}

export function evaluateScriptCreationPipelineResult(
  result: ScriptCreationPipelineResult,
  options: EvaluateScriptCreationPipelineOptions = {},
): ScriptQualityEvaluationReport {
  const artifacts = createArtifacts(result, options.draftPackageId);
  const issues = collectIssues(result);
  const issueSummary = summarizeIssues(issues);
  const repairIssueSummary = summarizeRepairIssues(result);
  const readiness = resolveReadiness(result, artifacts.readyForPublish, issueSummary.errors);
  const scores = scoreEvaluation(artifacts, issueSummary, readiness);

  return {
    passed: readiness === "ready_for_review",
    readiness,
    issueSummary,
    repairAttemptCount: result.repairAttempts?.length ?? 0,
    repairSucceeded: result.repairSucceeded ?? false,
    repairIssueSummary,
    issues,
    artifacts,
    ...scores,
  };
}

function evaluateMissingPipelineResult(job: GenerationJobRecord): ScriptQualityEvaluationReport {
  const issue: ScriptQualityEvaluationIssue = {
    code: "pipeline_result_missing",
    severity: "error",
    stage: "planner",
    path: "pipelineResult",
    message: `Generation job has no pipeline result: ${job.id}`,
  };
  const issueSummary = summarizeIssues([issue]);
  const artifacts = { storyBiblePresent: false, scriptPackageDraftPresent: false, draftPackageIdPresent: false, readyForPublish: false };
  return {
    passed: false,
    readiness: "failed",
    issueSummary,
    repairAttemptCount: 0,
    repairSucceeded: false,
    repairIssueSummary: { errors: 0, warnings: 0, info: 0 },
    issues: [issue],
    artifacts,
    storyBibleScore: 0,
    compileScore: 0,
    deterministicScore: 0,
    score: 0,
  };
}

function createArtifacts(
  result: ScriptCreationPipelineResult,
  draftPackageId?: string | null,
): ScriptQualityEvaluationReport["artifacts"] {
  return {
    storyBiblePresent: result.storyBible !== undefined,
    scriptPackageDraftPresent: result.scriptPackageDraft !== undefined,
    draftPackageIdPresent: Boolean(draftPackageId),
    readyForPublish: result.readyForPublish,
  };
}

function collectIssues(result: ScriptCreationPipelineResult): readonly ScriptQualityEvaluationIssue[] {
  return uniqueIssues([
    ...mapStoryBibleDiagnostics(result.storyAttempts ?? []),
    ...mapCriticDiagnostics(result.criticDiagnostics ?? []),
    ...mapQualityDiagnostics(result.qualityReport?.diagnostics ?? []),
    ...mapPipelineErrors(result),
  ]);
}

function mapStoryBibleDiagnostics(
  attempts: NonNullable<ScriptCreationPipelineResult["storyAttempts"]>,
): readonly ScriptQualityEvaluationIssue[] {
  const finalAttempt = attempts.at(-1);
  const diagnostics = finalAttempt?.storyBibleDiagnostics ?? [];
  return diagnostics.flatMap(toStoryBibleIssue);
}

function toStoryBibleIssue(diagnostic: unknown): readonly ScriptQualityEvaluationIssue[] {
  if (!isDiagnosticLike(diagnostic)) {
    return [];
  }

  return [{
    code: diagnostic.code,
    severity: diagnostic.severity,
    stage: "planner",
    message: diagnostic.message,
    ...optionalPath(diagnostic.path),
  }];
}

function mapCriticDiagnostics(diagnostics: readonly CriticDiagnostic[]): readonly ScriptQualityEvaluationIssue[] {
  return diagnostics.map((diagnostic) => ({
    code: `critic.${diagnostic.code}`,
    severity: diagnostic.severity,
    stage: "critic",
    path: diagnostic.path,
    message: diagnostic.message,
  }));
}

function mapQualityDiagnostics(
  diagnostics: readonly ScriptCreationPipelineDiagnostic[],
): readonly ScriptQualityEvaluationIssue[] {
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity,
    stage: "quality_gate",
    path: diagnostic.path,
    message: diagnostic.message,
  }));
}

function mapPipelineErrors(result: ScriptCreationPipelineResult): readonly ScriptQualityEvaluationIssue[] {
  return result.errors.flatMap((diagnostic) => {
    if (diagnostic.stage === "deterministic_review" && result.qualityReport) {
      return [];
    }

    return [{
      code: diagnostic.code,
      severity: diagnostic.severity,
      stage: mapPipelineStage(diagnostic.stage),
      path: diagnostic.path,
      message: diagnostic.message,
    }];
  });
}

function mapPipelineStage(stage: ScriptCreationPipelineStage): ScriptQualityEvaluationStage {
  if (stage === "criticizing_story") {
    return "critic";
  }

  if (stage === "compiling_draft") {
    return "compiler";
  }

  if (stage === "deterministic_review") {
    return "quality_gate";
  }

  return stage === "received_brief" ? "brief" : "planner";
}

function resolveReadiness(
  result: ScriptCreationPipelineResult,
  readyForPublish: boolean,
  errorCount: number,
): ScriptQualityEvaluationReadiness {
  if (result.status === "failed") {
    return "failed";
  }

  if (errorCount > 0 || !readyForPublish) {
    return "blocked";
  }

  return "ready_for_review";
}

function scoreEvaluation(
  artifacts: ScriptQualityEvaluationReport["artifacts"],
  summary: ScriptQualityEvaluationReport["issueSummary"],
  readiness: ScriptQualityEvaluationReadiness,
) {
  const storyBibleScore = artifacts.storyBiblePresent ? 100 : 0;
  const compileScore = artifacts.scriptPackageDraftPresent ? 100 : 0;
  const deterministicScore = scoreDeterministic(summary, artifacts.readyForPublish);
  const baseScore = Math.round((storyBibleScore + compileScore + deterministicScore) / 3);
  const score = readiness === "failed" ? Math.min(baseScore, 40) : baseScore;

  return { storyBibleScore, compileScore, deterministicScore, score };
}

function scoreDeterministic(
  summary: ScriptQualityEvaluationReport["issueSummary"],
  readyForPublish: boolean,
): number {
  if (!readyForPublish && summary.errors === 0) {
    return 50;
  }

  return Math.max(0, 100 - summary.errors * 40 - summary.warnings * 10 - summary.info * 2);
}

function summarizeIssues(issues: readonly ScriptQualityEvaluationIssue[]) {
  return issues.reduce(
    (summary, issue) => ({
      errors: summary.errors + (issue.severity === "error" ? 1 : 0),
      warnings: summary.warnings + (issue.severity === "warning" ? 1 : 0),
      info: summary.info + (issue.severity === "info" ? 1 : 0),
    }),
    { errors: 0, warnings: 0, info: 0 },
  );
}

function summarizeRepairIssues(result: ScriptCreationPipelineResult) {
  const diagnostics = (result.repairAttempts ?? []).flatMap((attempt) => attempt.diagnostics);
  return summarizeIssues(diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity,
    stage: mapPipelineStage(diagnostic.stage),
    path: diagnostic.path,
    message: diagnostic.message,
  })));
}

function uniqueIssues(issues: readonly ScriptQualityEvaluationIssue[]): readonly ScriptQualityEvaluationIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = [issue.stage, issue.code, issue.path, issue.message].join("|");
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isDiagnosticLike(value: unknown): value is Omit<ScriptQualityEvaluationIssue, "stage"> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const diagnostic = value as Record<string, unknown>;
  return typeof diagnostic.code === "string"
    && isSeverity(diagnostic.severity)
    && typeof diagnostic.message === "string";
}

function isSeverity(value: unknown): value is ScriptQualityEvaluationSeverity {
  return value === "info" || value === "warning" || value === "error";
}

function optionalPath(path: string | undefined): Pick<ScriptQualityEvaluationIssue, "path"> | Record<string, never> {
  return path === undefined ? {} : { path };
}

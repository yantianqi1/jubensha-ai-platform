import type { ScriptPackage, StoryBible } from "@jubensha/dsl";
import type { GenerationDiagnostic, GenerationJobRecord } from "./generation-job.js";
import type { ScriptCreationPipelineDiagnostic, ScriptCreationQualityReport } from "./script-creation-pipeline.js";
import type {
  CriticReviewSummaryDto,
  GenerationJobActivityDto,
  GenerationJobActivityLevel,
  GenerationJobDetailResponse,
  GenerationJobInputSummary,
  GenerationJobIssueDto,
  GenerationJobResultDto,
  GenerationJobStageDto,
  GenerationJobUiStageKey,
  GenerationJobUiStageState,
  QualityReportSummaryDto,
  RepairSummaryDto,
  ScriptPackageSummaryDto,
  StoryBibleSummaryDto,
} from "./generation-job-detail-types.js";

const STAGE_DEFS: readonly Omit<GenerationJobStageDto, "state" | "diagnostics">[] = [
  { key: "queued", label: "Queued", description: "Job accepted by creation service." },
  { key: "received_brief", label: "Brief received", description: "Input brief is ready for planning." },
  { key: "planning_story", label: "Story planning", description: "Planner proposes the StoryBible." },
  { key: "criticizing_story", label: "Critic review", description: "Critic checks structure and contradictions." },
  { key: "compiling_draft", label: "Compile draft", description: "StoryBible compiles to ScriptPackage draft." },
  { key: "deterministic_review", label: "Deterministic review", description: "DSL quality checks validate references and flow." },
  { key: "ready_for_review", label: "Ready for review", description: "Draft can enter human publish review." },
  { key: "blocked", label: "Blocked", description: "Blocking diagnostics require revision." },
  { key: "failed", label: "Failed", description: "Pipeline failed before a reviewable result." },
];

const PROGRESS: Record<GenerationJobUiStageKey, number> = {
  queued: 8,
  received_brief: 12,
  planning_story: 24,
  criticizing_story: 42,
  compiling_draft: 62,
  deterministic_review: 82,
  ready_for_review: 100,
  blocked: 88,
  failed: 24,
};

export function toGenerationJobDetailResponse(job: GenerationJobRecord): GenerationJobDetailResponse {
  const currentStage = resolveCurrentStage(job);
  return {
    jobId: job.id,
    status: job.status,
    currentStage,
    progressPercent: mapGenerationJobProgress(currentStage).progressPercent,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    input: summarizeInput(job),
    stages: mapStageDtos(job, currentStage),
    activity: buildActivity(job, currentStage),
    result: summarizeResult(job),
  };
}

export function mapGenerationJobProgress(stage: GenerationJobUiStageKey) {
  return { currentStage: stage, progressPercent: PROGRESS[stage] };
}

function resolveCurrentStage(job: GenerationJobRecord): GenerationJobUiStageKey {
  if (job.status === "queued") return "queued";
  if (job.status === "planning") return "planning_story";
  if (job.status === "criticizing" || job.status === "repairing") return "criticizing_story";
  if (job.status === "compiled") return "deterministic_review";
  return job.pipelineResult?.stage ?? job.status;
}

function summarizeInput(job: GenerationJobRecord): GenerationJobInputSummary {
  const summary = job.pipelineResult?.inputSummary;
  return {
    ...optionalField("title", summary?.title ?? job.brief.title),
    premise: summary?.premise ?? job.brief.premise,
    playerCount: summary?.playerCount ?? job.brief.playerCount,
    ...optionalField("genre", summary?.genre ?? job.brief.genre),
  };
}

function mapStageDtos(
  job: GenerationJobRecord,
  currentStage: GenerationJobUiStageKey,
): readonly GenerationJobStageDto[] {
  const terminalStage = resolveTerminalStage(job, currentStage);
  return STAGE_DEFS.map((stage) => ({
    ...stage,
    state: getStageState(stage.key, currentStage, terminalStage),
    ...optionalDiagnostics(stage.key, job),
  }));
}

function getStageState(
  stage: GenerationJobUiStageKey,
  currentStage: GenerationJobUiStageKey,
  terminalStage: GenerationJobUiStageKey | null,
): GenerationJobUiStageState {
  if (currentStage === "ready_for_review") return "completed";
  if (terminalStage && stage === terminalStage) return currentStage === "failed" ? "failed" : "blocked";
  if (!terminalStage && stage === currentStage) return "active";
  return stageIndex(stage) < stageIndex(currentStage) ? "completed" : "pending";
}

function resolveTerminalStage(
  job: GenerationJobRecord,
  currentStage: GenerationJobUiStageKey,
): GenerationJobUiStageKey | null {
  if (currentStage !== "blocked" && currentStage !== "failed") return null;
  const diagnosticStage = collectPipelineDiagnostics(job).find((diagnostic) => diagnostic.stage !== currentStage)?.stage;
  return diagnosticStage ?? currentStage;
}

function optionalDiagnostics(stage: GenerationJobUiStageKey, job: GenerationJobRecord) {
  const diagnostics = collectPipelineDiagnostics(job).filter((diagnostic) => diagnostic.stage === stage).map(toIssue);
  return diagnostics.length > 0 ? { diagnostics } : {};
}

function summarizeResult(job: GenerationJobRecord): GenerationJobResultDto {
  const result = job.pipelineResult;
  return {
    ...optionalField("storyBibleSummary", result?.storyBible ? summarizeStoryBible(result.storyBible) : undefined),
    ...optionalField("criticReview", result?.criticDiagnostics ? summarizeCritic(result.criticDiagnostics) : undefined),
    ...optionalField("scriptPackageDraftSummary", result?.scriptPackageDraft ? summarizePackage(result.scriptPackageDraft) : undefined),
    ...optionalField("qualityReport", result?.qualityReport ? summarizeQuality(result.qualityReport) : undefined),
    ...optionalField("repairSummary", result ? summarizeRepair(result) : undefined),
    readyForPublish: job.readyForPublish,
    draftPackageId: job.draftPackageId,
    errors: job.diagnostics.map(toIssue),
  };
}

function summarizeStoryBible(storyBible: StoryBible): StoryBibleSummaryDto {
  return {
    title: storyBible.meta.title,
    logline: storyBible.theme.premise,
    genre: storyBible.meta.genre,
    tone: storyBible.theme.tone,
    roleCount: storyBible.characters.length,
    clueCount: storyBible.clues.length,
    actCount: storyBible.acts.length,
    timelineCount: storyBible.truth.timeline.length,
  };
}

function summarizeCritic(diagnostics: readonly GenerationDiagnostic[]): CriticReviewSummaryDto {
  const issues = diagnostics.map(toIssue);
  const severity = readMaxSeverity(issues);
  return { passed: !issues.some((issue) => issue.severity === "error"), severity, issueCount: issues.length, requiredRevisions: issues };
}

function summarizePackage(scriptPackage: ScriptPackage): ScriptPackageSummaryDto {
  return {
    title: scriptPackage.title,
    packageCode: scriptPackage.package_code,
    status: scriptPackage.status,
    roleCount: scriptPackage.roles.length,
    clueCount: scriptPackage.clues.length,
    sceneCount: scriptPackage.scenes.length,
  };
}

function summarizeQuality(report: ScriptCreationQualityReport): QualityReportSummaryDto {
  const issues = report.diagnostics.map(toIssue);
  return { readyForPublish: report.readyForPublish, errorCount: report.summary.errors, warningCount: report.summary.warnings, issueCount: issues.length, issues };
}

function summarizeRepair(result: NonNullable<GenerationJobRecord["pipelineResult"]>): RepairSummaryDto {
  const issues = (result.repairAttempts ?? []).flatMap((attempt) => attempt.diagnostics).map(toIssue);
  return {
    attempted: result.repairAttempted ?? false,
    succeeded: result.repairSucceeded ?? false,
    attemptCount: result.repairAttempts?.length ?? 0,
    maxAttempts: result.maxRepairAttempts ?? 0,
    issueCount: issues.length,
    issues,
  };
}

function buildActivity(job: GenerationJobRecord, currentStage: GenerationJobUiStageKey): readonly GenerationJobActivityDto[] {
  return [queuedActivity(job), ...resultActivities(job, currentStage), ...draftActivity(job)];
}

function queuedActivity(job: GenerationJobRecord): GenerationJobActivityDto {
  return { id: `${job.id}:queued`, stage: "queued", level: "info", message: "Job queued", timestamp: job.createdAt };
}

function resultActivities(job: GenerationJobRecord, currentStage: GenerationJobUiStageKey): readonly GenerationJobActivityDto[] {
  const result = job.pipelineResult;
  if (!result) return [];
  return [storyActivity(job), criticActivity(job), repairActivity(job), draftCompileActivity(job), qualityActivity(job), ...errorActivities(job, currentStage)].filter(Boolean) as GenerationJobActivityDto[];
}

function storyActivity(job: GenerationJobRecord): GenerationJobActivityDto | null {
  return job.pipelineResult?.storyBible ? activity({ job, stage: "planning_story", level: "success", message: "Story planning completed" }) : null;
}

function criticActivity(job: GenerationJobRecord): GenerationJobActivityDto | null {
  const diagnostics = job.pipelineResult?.criticDiagnostics ?? [];
  const blocked = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (!job.pipelineResult?.criticDiagnostics) return null;
  return activity({ job, stage: "criticizing_story", level: blocked ? "error" : "success", message: blocked ? "Critic review blocked generation" : "Critic review passed" });
}

function draftCompileActivity(job: GenerationJobRecord): GenerationJobActivityDto | null {
  return job.pipelineResult?.scriptPackageDraft ? activity({ job, stage: "compiling_draft", level: "success", message: "Draft package compiled" }) : null;
}

function qualityActivity(job: GenerationJobRecord): GenerationJobActivityDto | null {
  const report = job.pipelineResult?.qualityReport;
  if (!report) return null;
  const blocked = report.diagnostics.some((diagnostic) => diagnostic.severity === "error");
  return activity({ job, stage: "deterministic_review", level: blocked ? "error" : "success", message: blocked ? "Deterministic review found blocking errors" : "Deterministic review passed" });
}

function repairActivity(job: GenerationJobRecord): GenerationJobActivityDto | null {
  const result = job.pipelineResult;
  if (!result?.repairAttempted) return null;
  const level = result.repairSucceeded ? "success" : "warning";
  const message = result.repairSucceeded ? "Quality repair succeeded" : "Quality repair did not clear all issues";
  return activity({ job, stage: "deterministic_review", level, message, code: "quality_repair", details: result.repairAttempts });
}

function draftActivity(job: GenerationJobRecord): readonly GenerationJobActivityDto[] {
  if (!job.draftPackageId) return [];
  return [activity({ job, stage: "ready_for_review", level: "success", message: "Content draft saved", code: "draft_saved", details: { draftPackageId: job.draftPackageId } })];
}

function errorActivities(job: GenerationJobRecord, stage: GenerationJobUiStageKey): readonly GenerationJobActivityDto[] {
  return job.diagnostics.map((diagnostic) => activity({ job, stage, level: "error", message: `Job failed: ${diagnostic.code}`, code: diagnostic.code, details: diagnostic }));
}

interface ActivityOptions {
  readonly job: GenerationJobRecord;
  readonly stage: GenerationJobUiStageKey;
  readonly level: GenerationJobActivityLevel;
  readonly message: string;
  readonly code?: string;
  readonly details?: unknown;
}

function activity(options: ActivityOptions): GenerationJobActivityDto {
  return {
    id: `${options.job.id}:${options.stage}:${options.message}`,
    stage: options.stage,
    level: options.level,
    message: options.message,
    timestamp: options.job.updatedAt,
    ...optionalField("code", options.code),
    ...optionalField("details", options.details),
  };
}

function collectPipelineDiagnostics(job: GenerationJobRecord): readonly ScriptCreationPipelineDiagnostic[] {
  return [...(job.pipelineResult?.errors ?? []), ...(job.pipelineResult?.qualityReport?.diagnostics ?? [])];
}

function toIssue(diagnostic: GenerationDiagnostic | ScriptCreationPipelineDiagnostic): GenerationJobIssueDto {
  return { severity: diagnostic.severity, code: diagnostic.code, ...optionalField("path", diagnostic.path), message: diagnostic.message };
}

function readMaxSeverity(issues: readonly GenerationJobIssueDto[]): "info" | "warning" | "error" {
  if (issues.some((issue) => issue.severity === "error")) return "error";
  return issues.some((issue) => issue.severity === "warning") ? "warning" : "info";
}

function stageIndex(stage: GenerationJobUiStageKey): number {
  return STAGE_DEFS.findIndex((definition) => definition.key === stage);
}

function optionalField<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}

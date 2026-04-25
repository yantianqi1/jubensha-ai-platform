import type { ScriptPackage } from "@jubensha/dsl";
import type { ScriptPackageRecord } from "../content/content-repository.js";
import type { GenerateStoryBibleResult } from "./creation-orchestrator.js";
import type {
  ScriptCreationPipelineDiagnostic,
  ScriptCreationPipelineResult,
  ScriptCreationPipelineStage,
} from "./script-creation-pipeline.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";

export type GenerationJobStatus =
  | "queued"
  | "planning"
  | "criticizing"
  | "repairing"
  | "compiled"
  | "blocked"
  | "failed"
  | "ready_for_review";

export interface GenerationDiagnostic {
  readonly severity: "info" | "warning" | "error";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface GenerationDraftWriter {
  createDraftPackage(scriptPackage: ScriptPackage): Promise<ScriptPackageRecord>;
}

export interface GenerationAttemptRecord {
  readonly id: string;
  readonly attempt: number;
  readonly accepted: boolean;
  readonly storyBible: unknown;
  readonly criticDiagnostics: readonly unknown[];
  readonly storyBibleDiagnostics: readonly unknown[];
  readonly createdAt: string;
}

export interface GenerationJobEventEnvelope {
  readonly eventId: string;
  readonly jobId: string;
  readonly sequence: number;
  readonly type: "job_created" | "job_status_changed" | "attempt_recorded" | "diagnostic_recorded";
  readonly payload: unknown;
}

export interface GenerationJobRecord {
  readonly id: string;
  readonly status: GenerationJobStatus;
  readonly brief: StoryPlannerInput;
  readonly attempts: readonly GenerationAttemptRecord[];
  readonly selectedAttemptId: string | null;
  readonly draftPackageId: string | null;
  readonly readyForPublish: boolean | null;
  readonly pipelineResult: ScriptCreationPipelineResult | null;
  readonly diagnostics: readonly GenerationDiagnostic[];
  readonly events: readonly GenerationJobEventEnvelope[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createInitialJob(
  jobId: string,
  brief: StoryPlannerInput,
  now: string,
): GenerationJobRecord {
  return {
    id: jobId,
    status: "queued",
    brief,
    attempts: [],
    selectedAttemptId: null,
    draftPackageId: null,
    readyForPublish: null,
    pipelineResult: null,
    diagnostics: [],
    events: [createEvent(jobId, 1, "job_created", { status: "queued" })],
    createdAt: now,
    updatedAt: now,
  };
}

export function toPipelineJob(
  job: GenerationJobRecord,
  result: ScriptCreationPipelineResult,
  draftPackage: ScriptPackageRecord | null,
  now: string,
): GenerationJobRecord {
  const attempts = (result.storyAttempts ?? []).map((attempt) => toAttemptRecord(job.id, attempt, now));
  const selectedAttempt = attempts.find((attempt) => attempt.accepted) ?? attempts.at(-1) ?? null;
  const diagnostics = result.errors.map(toGenerationDiagnostic);

  return {
    ...job,
    status: toJobStatus(result.status),
    attempts,
    selectedAttemptId: selectedAttempt?.id ?? null,
    draftPackageId: draftPackage?.id ?? null,
    readyForPublish: result.readyForPublish,
    pipelineResult: result,
    diagnostics,
    events: createRunEvents(job, result.status, attempts, diagnostics),
    updatedAt: now,
  };
}

export function toFailedJob(job: GenerationJobRecord, error: unknown, now: string): GenerationJobRecord {
  const diagnostic = readFailureDiagnostic(error);
  return {
    ...job,
    status: "failed",
    readyForPublish: false,
    diagnostics: [diagnostic],
    pipelineResult: createFailurePipelineResult(job, diagnostic),
    events: [
      ...job.events,
      createEvent(job.id, 2, "job_status_changed", { status: "failed" }),
      createEvent(job.id, 3, "diagnostic_recorded", diagnostic),
    ],
    updatedAt: now,
  };
}

export function readCursor(afterEventId: string | undefined, jobId: string): number {
  if (!afterEventId) {
    return 0;
  }

  const [cursorJobId, sequence] = afterEventId.split(":");

  if (cursorJobId !== jobId || !sequence || !Number.isInteger(Number(sequence))) {
    throw new Error(`Invalid generation job event cursor: ${afterEventId}`);
  }

  return Number(sequence);
}

function toJobStatus(status: ScriptCreationPipelineStage): GenerationJobStatus {
  if (status === "ready_for_review" || status === "blocked" || status === "failed") {
    return status;
  }

  if (status === "planning_story") {
    return "planning";
  }

  if (status === "criticizing_story") {
    return "criticizing";
  }

  return status === "compiling_draft" || status === "deterministic_review" ? "compiled" : "queued";
}

function toGenerationDiagnostic(diagnostic: ScriptCreationPipelineDiagnostic): GenerationDiagnostic {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    path: diagnostic.path,
    message: diagnostic.message,
  };
}

function createRunEvents(
  job: GenerationJobRecord,
  status: ScriptCreationPipelineStage,
  attempts: readonly GenerationAttemptRecord[],
  diagnostics: readonly GenerationDiagnostic[],
): readonly GenerationJobEventEnvelope[] {
  return [
    ...job.events,
    createEvent(job.id, 2, "job_status_changed", { status: toJobStatus(status) }),
    ...attemptEvents(job.id, attempts),
    ...diagnosticEvents(job.id, attempts.length + 3, diagnostics),
  ];
}

function createFailurePipelineResult(
  job: GenerationJobRecord,
  diagnostic: GenerationDiagnostic,
): ScriptCreationPipelineResult {
  return {
    runId: job.id,
    inputSummary: summarizeBrief(job.brief),
    stage: "failed",
    status: "failed",
    readyForPublish: false,
    errors: [{ ...diagnostic, path: diagnostic.path ?? "$", stage: "failed" }],
  };
}

function summarizeBrief(brief: StoryPlannerInput) {
  return {
    premise: brief.premise,
    playerCount: brief.playerCount,
    ...optionalField("title", brief.title),
    ...optionalField("genre", brief.genre),
  };
}

function toAttemptRecord(
  jobId: string,
  attempt: GenerateStoryBibleResult["attempts"][number],
  now: string,
): GenerationAttemptRecord {
  return { ...attempt, id: `${jobId}_attempt_${attempt.attempt}`, createdAt: now };
}

function attemptEvents(
  jobId: string,
  attempts: readonly GenerationAttemptRecord[],
): readonly GenerationJobEventEnvelope[] {
  return attempts.map((attempt, index) =>
    createEvent(jobId, index + 3, "attempt_recorded", { attemptId: attempt.id, accepted: attempt.accepted }),
  );
}

function diagnosticEvents(
  jobId: string,
  startSequence: number,
  diagnostics: readonly GenerationDiagnostic[],
): readonly GenerationJobEventEnvelope[] {
  return diagnostics.map((diagnostic, index) =>
    createEvent(jobId, startSequence + index, "diagnostic_recorded", diagnostic),
  );
}

function createEvent(
  jobId: string,
  sequence: number,
  type: GenerationJobEventEnvelope["type"],
  payload: unknown,
): GenerationJobEventEnvelope {
  return { eventId: `${jobId}:${sequence}`, jobId, sequence, type, payload };
}

function readFailureDiagnostic(error: unknown): GenerationDiagnostic {
  return {
    severity: "error",
    code: "pipeline_error",
    path: "$",
    message: error instanceof Error ? error.message : "Unknown generation provider error",
  };
}

function optionalField<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}

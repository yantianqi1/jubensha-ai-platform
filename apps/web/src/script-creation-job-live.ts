import type { GenerationJob, StudioGenerateStoryBibleRequest } from "./api-client-types.js";
import type {
  ScriptCreationActivityView,
  ScriptCreationDiagnosticView,
  ScriptCreationJobStage,
  ScriptCreationJobView,
} from "./script-creation-job-types.js";

const TERMINAL_STAGES = new Set(["ready_for_review", "blocked", "failed"]);
const POLL_DELAY_MS = 2_500;

export interface ScriptCreationJobLivePorts {
  readonly readBrief: () => Pick<StudioGenerateStoryBibleRequest, "premise" | "playerCount"> & Partial<StudioGenerateStoryBibleRequest>;
  readonly readJobId: () => string;
  readonly writeJobId: (jobId: string) => void;
  readonly createJob: (request: Pick<StudioGenerateStoryBibleRequest, "premise" | "playerCount"> & Partial<StudioGenerateStoryBibleRequest>) => Promise<GenerationJob>;
  readonly runJob: (jobId: string) => Promise<GenerationJob>;
  readonly getJob: (jobId: string) => Promise<GenerationJob>;
  readonly renderJob: (job: ScriptCreationJobView) => void;
  readonly renderError: (message: string) => void;
  readonly setTimer: (callback: () => void, delayMs: number) => unknown;
  readonly clearTimer: (timer: unknown) => void;
}

export function createScriptCreationJobLiveController(ports: ScriptCreationJobLivePorts) {
  let pollTimer: unknown;

  return {
    async createAndRunJob(): Promise<void> {
      clearPolling();
      await runCreateFlow(ports, renderJobResult);
    },
    async loadExistingJob(): Promise<void> {
      const jobId = ports.readJobId().trim();
      if (!jobId) return ports.renderError("请输入 generation job id。");
      await fetchAndRender(jobId, ports, renderJobResult);
    },
    stop(): void {
      clearPolling();
    },
  };

  function startPolling(jobId: string): void {
    clearPolling();
    pollTimer = ports.setTimer(() => void fetchAndRender(jobId, ports, renderJobResult), POLL_DELAY_MS);
  }

  function renderJobResult(job: GenerationJob): void {
    ports.renderJob(mapGenerationJobDetailToView(job));
    if (TERMINAL_STAGES.has(job.currentStage)) {
      clearPolling();
      return;
    }
    startPolling(job.jobId);
  }

  function clearPolling(): void {
    if (pollTimer !== undefined) ports.clearTimer(pollTimer);
    pollTimer = undefined;
  }
}

export function mapGenerationJobDetailToView(job: GenerationJob): ScriptCreationJobView {
  return {
    id: job.jobId,
    stage: normalizeStage(job.currentStage),
    title: job.input.title ?? job.result.storyBibleSummary?.title ?? job.jobId,
    brief: job.input.premise,
    progress: job.progressPercent,
    readyForPublish: job.result.readyForPublish === true,
    ...optionalField("storyBible", mapStoryBible(job)),
    ...optionalField("criticReview", mapCriticReview(job)),
    ...optionalField("draftPackage", mapDraftPackage(job)),
    ...optionalField("qualityReport", mapQualityReport(job)),
    activity: job.activity.map(mapActivity),
    errors: job.result.errors.map(mapIssue),
  };
}

async function runCreateFlow(
  ports: ScriptCreationJobLivePorts,
  renderJob: (job: GenerationJob) => void,
): Promise<void> {
  try {
    const created = await ports.createJob(ports.readBrief());
    ports.writeJobId(created.jobId);
    renderJob(created);
    renderJob(await ports.runJob(created.jobId));
  } catch (error) {
    ports.renderError(readError(error));
  }
}

async function fetchAndRender(
  jobId: string,
  ports: ScriptCreationJobLivePorts,
  renderJob: (job: GenerationJob) => void,
): Promise<void> {
  try {
    renderJob(await ports.getJob(jobId));
  } catch (error) {
    ports.renderError(readError(error));
  }
}

function mapStoryBible(job: GenerationJob): ScriptCreationJobView["storyBible"] | undefined {
  const summary = job.result.storyBibleSummary;
  return summary ? { premise: summary.logline, theme: summary.tone, characters: [`${summary.roleCount} roles`, `${summary.clueCount} clues`, `${summary.actCount} acts`] } : undefined;
}

function mapCriticReview(job: GenerationJob): ScriptCreationJobView["criticReview"] | undefined {
  const review = job.result.criticReview;
  if (!review) return undefined;
  const verdict = review.passed ? "Critic review passed" : "Critic review requires revision";
  return { verdict, diagnostics: review.requiredRevisions.map(mapIssue) };
}

function mapDraftPackage(job: GenerationJob): ScriptCreationJobView["draftPackage"] | undefined {
  const summary = job.result.scriptPackageDraftSummary;
  if (!summary) return undefined;
  return { packageId: job.result.draftPackageId ?? summary.packageCode, acts: summary.roleCount, scenes: summary.sceneCount, clues: summary.clueCount };
}

function mapQualityReport(job: GenerationJob): ScriptCreationJobView["qualityReport"] | undefined {
  const report = job.result.qualityReport;
  if (!report) return undefined;
  const score = Math.max(0, 100 - report.errorCount * 30 - report.warningCount);
  return { score, diagnostics: report.issues.map(mapIssue) };
}

function mapActivity(activity: GenerationJob["activity"][number]): ScriptCreationActivityView {
  return { time: activity.timestamp ?? "--", title: activity.message, detail: activity.code ?? activity.stage ?? "job", severity: normalizeSeverity(activity.level) };
}

function mapIssue(issue: { readonly code: string; readonly message: string; readonly severity: string }): ScriptCreationDiagnosticView {
  return { code: issue.code, message: issue.message, severity: normalizeSeverity(issue.severity) };
}

function normalizeSeverity(severity: string): ScriptCreationDiagnosticView["severity"] {
  if (severity === "error" || severity === "warning") return severity;
  return "info";
}

function normalizeStage(stage: string): ScriptCreationJobStage {
  return stage === "received_brief" ? "queued" : stage as ScriptCreationJobStage;
}

function optionalField<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

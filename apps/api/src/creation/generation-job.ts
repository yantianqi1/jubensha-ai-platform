import type { ScriptPackageRecord } from "../content/content-repository.js";
import {
  createInitialJob,
  readCursor,
  toFailedJob,
  toPipelineJob,
  type GenerationDraftWriter,
  type GenerationJobRecord,
} from "./generation-job-model.js";
import type { ScriptCreationPipeline } from "./script-creation-pipeline.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";

export type {
  GenerationAttemptRecord,
  GenerationDiagnostic,
  GenerationDraftWriter,
  GenerationJobEventEnvelope,
  GenerationJobRecord,
  GenerationJobStatus,
} from "./generation-job-model.js";

export interface ListGenerationJobEventsInput {
  readonly afterEventId?: string;
}

export interface GenerationJobRepository {
  saveJob(job: GenerationJobRecord): Promise<GenerationJobRecord>;
  findJob(jobId: string): Promise<GenerationJobRecord | null>;
}

export interface GenerationJobServiceOptions {
  readonly repository: GenerationJobRepository;
  readonly pipeline: Pick<ScriptCreationPipeline, "run">;
  readonly draftWriter: GenerationDraftWriter;
  readonly idGenerator: () => string;
  readonly now: () => string;
}

export class GenerationJobNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationJobNotFoundError";
  }
}

export class InMemoryGenerationJobRepository implements GenerationJobRepository {
  private readonly jobs = new Map<string, GenerationJobRecord>();

  async saveJob(job: GenerationJobRecord): Promise<GenerationJobRecord> {
    this.jobs.set(job.id, job);
    return job;
  }

  async findJob(jobId: string): Promise<GenerationJobRecord | null> {
    return this.jobs.get(jobId) ?? null;
  }
}

export class GenerationJobService {
  private readonly repository: GenerationJobRepository;
  private readonly pipeline: Pick<ScriptCreationPipeline, "run">;
  private readonly draftWriter: GenerationDraftWriter;
  private readonly idGenerator: () => string;
  private readonly now: () => string;

  constructor(options: GenerationJobServiceOptions) {
    this.repository = options.repository;
    this.pipeline = options.pipeline;
    this.draftWriter = options.draftWriter;
    this.idGenerator = options.idGenerator;
    this.now = options.now;
  }

  async createJob(brief: StoryPlannerInput): Promise<GenerationJobRecord> {
    const now = this.now();
    return this.repository.saveJob(createInitialJob(this.idGenerator(), brief, now));
  }

  async getJob(jobId: string): Promise<GenerationJobRecord> {
    const job = await this.repository.findJob(jobId);

    if (!job) {
      throw new GenerationJobNotFoundError(`Generation job not found: ${jobId}`);
    }

    return job;
  }

  async runJob(jobId: string): Promise<GenerationJobRecord> {
    const job = await this.getJob(jobId);

    try {
      const result = await this.pipeline.run({ brief: job.brief, runId: job.id });
      const draftPackage = await saveDraftIfPresent(this.draftWriter, result.scriptPackageDraft);
      return this.repository.saveJob(toPipelineJob(job, result, draftPackage, this.now()));
    } catch (error) {
      return this.repository.saveJob(toFailedJob(job, error, this.now()));
    }
  }

  async listJobEvents(
    jobId: string,
    input: ListGenerationJobEventsInput,
  ): Promise<readonly GenerationJobRecord["events"][number][]> {
    const job = await this.getJob(jobId);
    const cursor = readCursor(input.afterEventId, jobId);
    return job.events.filter((event) => event.sequence > cursor);
  }
}

async function saveDraftIfPresent(
  draftWriter: GenerationDraftWriter,
  scriptPackageDraft: Parameters<GenerationDraftWriter["createDraftPackage"]>[0] | undefined,
): Promise<ScriptPackageRecord | null> {
  if (!scriptPackageDraft) {
    return null;
  }

  return draftWriter.createDraftPackage(scriptPackageDraft);
}

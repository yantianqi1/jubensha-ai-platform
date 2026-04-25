import { Inject, Injectable } from "@nestjs/common";
import type { StoryBible, ThemeAssetDescriptor, ThemeAssetManifest } from "@jubensha/dsl";
import type { ThemeAssetProvider, ThemeAssetProviderResult } from "./theme-asset-provider.js";
import { THEME_ASSET_PROVIDER, ThemeAssetProviderError } from "./theme-asset-provider.js";

export type ThemeAssetJobStatus = "queued" | "running" | "failed" | "completed";

export interface CreateThemeAssetJobInput {
  readonly storyBible: StoryBible;
  readonly manifest: ThemeAssetManifest;
}

export interface ThemeAssetJobFailure {
  readonly code: string;
  readonly message: string;
}

export interface ThemeAssetJobRecord {
  readonly id: string;
  readonly storyTitle: string;
  readonly status: ThemeAssetJobStatus;
  readonly requestedAssets: readonly ThemeAssetDescriptor[];
  readonly generatedAssets: readonly ThemeAssetProviderResult[];
  readonly failure?: ThemeAssetJobFailure;
}

@Injectable()
export class ThemeAssetJobStore {
  private readonly jobs = new Map<string, ThemeAssetJobRecord>();
  private nextId = 1;

  createJob(input: CreateThemeAssetJobInput): ThemeAssetJobRecord {
    const job: ThemeAssetJobRecord = {
      id: `theme_asset_job_${this.nextId}`,
      storyTitle: input.storyBible.meta.title,
      status: "queued",
      requestedAssets: input.manifest.assets,
      generatedAssets: [],
    };

    this.nextId += 1;
    this.jobs.set(job.id, job);

    return job;
  }

  getJob(jobId: string): ThemeAssetJobRecord | undefined {
    return this.jobs.get(jobId);
  }

  saveJob(job: ThemeAssetJobRecord): ThemeAssetJobRecord {
    this.jobs.set(job.id, job);
    return job;
  }
}

@Injectable()
export class ThemeAssetJobExecutor {
  constructor(
    private readonly jobs: ThemeAssetJobStore,
    @Inject(THEME_ASSET_PROVIDER) private readonly provider: ThemeAssetProvider,
  ) {}

  async runJob(jobId: string): Promise<ThemeAssetJobRecord | undefined> {
    const job = this.jobs.getJob(jobId);

    if (!job) {
      return undefined;
    }

    this.jobs.saveJob(markRunning(job));

    try {
      return this.jobs.saveJob(await generateAssets(job, this.provider));
    } catch (error) {
      return this.jobs.saveJob(markFailed(job, readProviderFailure(error)));
    }
  }
}

async function generateAssets(
  job: ThemeAssetJobRecord,
  provider: ThemeAssetProvider,
): Promise<ThemeAssetJobRecord> {
  const generatedAssets = [];

  for (const asset of job.requestedAssets) {
    generatedAssets.push(await provider.generateAsset(asset));
  }

  return { ...withoutFailure(job), status: "completed", generatedAssets };
}

function markRunning(job: ThemeAssetJobRecord): ThemeAssetJobRecord {
  return { ...withoutFailure(job), status: "running" };
}

function withoutFailure(job: ThemeAssetJobRecord): Omit<ThemeAssetJobRecord, "failure"> {
  const { failure, ...jobWithoutFailure } = job;
  return jobWithoutFailure;
}

function markFailed(
  job: ThemeAssetJobRecord,
  failure: ThemeAssetJobFailure,
): ThemeAssetJobRecord {
  return { ...job, status: "failed", generatedAssets: [], failure };
}

function readProviderFailure(error: unknown): ThemeAssetJobFailure {
  if (error instanceof ThemeAssetProviderError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: "ThemeAssetProviderError", message: error.message };
  }

  return { code: "ThemeAssetProviderError", message: "Unknown theme asset provider error" };
}

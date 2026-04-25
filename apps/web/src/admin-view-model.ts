import { ApiClientError, type ApiPublishedVersion, type PublishReviewBlocker, type PublishReviewSummary, type ThemeAssetJob } from "./api-client.js";

export interface AdminReviewViewModel {
  readonly title: string;
  readonly readiness: string;
  readonly qualityCounts: string;
  readonly goldenRegression: string;
  readonly blockers: readonly string[];
}

export interface AdminAssetJobViewModel {
  readonly summary: string;
  readonly failure?: string;
  readonly generatedAssets: readonly string[];
}

export function createAdminReviewViewModel(review: PublishReviewSummary): AdminReviewViewModel {
  const blockerCount = review.blockers.length;
  const title = review.title ?? review.packageId;

  return {
    title: `${title} (${review.packageCode ?? review.packageId})`,
    readiness: review.readyForPublish ? "已就绪：可发布" : `未就绪：${blockerCount} 个发布阻断项`,
    qualityCounts: formatQualityCounts(review),
    goldenRegression: formatGoldenRegression(review),
    blockers: review.blockers.length === 0 ? ["无发布阻断项"] : review.blockers.map(formatBlocker),
  };
}

export function createPublishResultMessage(version: ApiPublishedVersion): string {
  return `发布成功：${version.id} / ${version.semver} / ${version.state}`;
}

export function summarizeAssetJob(job: ThemeAssetJob): string {
  const id = job.jobId ?? job.id ?? "unknown";
  const failure = job.failure ? `，failure ${job.failure.code}: ${job.failure.message}` : "";
  return `Asset Job ${id}：${job.status}，requested assets ${job.requestedAssets.length}${failure}`;
}

export function createAssetJobViewModel(job: ThemeAssetJob): AdminAssetJobViewModel {
  const base = {
    summary: summarizeAssetJob(job),
    generatedAssets: (job.generatedAssets ?? []).map((asset) => `${asset.assetCode} -> ${asset.uri} @ ${asset.provider}`),
  };

  return job.failure ? { ...base, failure: `${job.failure.code}: ${job.failure.message}` } : base;
}

export function formatAdminApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return `${error.status} ${error.errorCode}: ${error.responseBody.message}\n${JSON.stringify(error.responseBody, null, 2)}`;
  }

  return error instanceof Error ? error.message : "Unknown error";
}

function formatQualityCounts(review: PublishReviewSummary): string {
  const summary = review.checks.qualityGate?.summary ?? { errors: 0, warnings: 0, info: 0 };
  return `Quality Gate：${summary.errors} errors / ${summary.warnings} warnings / ${summary.info} info`;
}

function formatGoldenRegression(review: PublishReviewSummary): string {
  const regression = review.checks.goldenRegression;

  if (!regression) {
    return "Golden Regression：未返回结果";
  }

  return regression.passed
    ? `Golden Regression：passed (${regression.total} checked)`
    : `Golden Regression：${regression.failed}/${regression.total} failed`;
}

function formatBlocker(blocker: PublishReviewBlocker): string {
  const message = blocker.message ? `：${blocker.message}` : "";
  return `${blocker.source} ${blocker.code} @ ${blocker.path}${message}`;
}

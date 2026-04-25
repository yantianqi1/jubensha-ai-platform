import type { ApiPublishedVersion, PublishReviewSummary, ThemeAssetJob } from "./api-client.js";
import { createAdminReviewViewModel, createAssetJobViewModel, createPublishResultMessage, formatAdminApiError } from "./admin-view-model.js";

export interface AdminBrowserWorkflowPorts {
  readonly readPackageId: () => string;
  readonly readSemver: () => string;
  readonly readAssetJobId: () => string;
  readonly getPublishReview: (packageId: string) => Promise<PublishReviewSummary>;
  readonly publishDraft: (packageId: string, semver: string) => Promise<ApiPublishedVersion>;
  readonly runThemeAssetJob: (jobId: string) => Promise<ThemeAssetJob>;
  readonly getThemeAssetJob: (jobId: string) => Promise<ThemeAssetJob>;
  readonly writeReview: (state: AdminReviewPanelState) => void;
  readonly writeReviewError: (message: string) => void;
  readonly writePublishStatus: (message: string) => void;
  readonly writeAssetJob: (message: string) => void;
}

export interface AdminReviewPanelState {
  readonly title: string;
  readonly readiness: string;
  readonly qualityCounts: string;
  readonly goldenRegression: string;
  readonly blockers: readonly string[];
}

export function createAdminBrowserWorkflow(ports: AdminBrowserWorkflowPorts) {
  return {
    fetchPublishReview: () => fetchPublishReview(ports),
    publishDraft: () => publishDraft(ports),
    inspectAssetJob: () => inspectAssetJob(ports),
    runAssetJob: () => runAssetJob(ports),
  };
}

async function fetchPublishReview(ports: AdminBrowserWorkflowPorts): Promise<void> {
  const packageId = ports.readPackageId();

  if (!packageId) {
    ports.writeReviewError("请输入 packageId。");
    return;
  }

  ports.writePublishStatus("Publish review 查询中...");
  await renderReview(packageId, ports);
}

async function publishDraft(ports: AdminBrowserWorkflowPorts): Promise<void> {
  const packageId = ports.readPackageId();
  const semver = ports.readSemver();

  if (!packageId || !semver) {
    ports.writePublishStatus("请输入 packageId 和 semver 后再显式发布。");
    return;
  }

  ports.writePublishStatus("发布请求提交中，PublishGate 将强制校验...");
  await submitPublish({ packageId, semver, ports });
}

async function inspectAssetJob(ports: AdminBrowserWorkflowPorts): Promise<void> {
  const jobId = ports.readAssetJobId();

  if (!jobId) {
    ports.writeAssetJob("请输入 asset job id；不会假设任务完成。");
    return;
  }

  await renderAssetJob(jobId, ports);
}

async function runAssetJob(ports: AdminBrowserWorkflowPorts): Promise<void> {
  const jobId = ports.readAssetJobId();

  if (!jobId) {
    ports.writeAssetJob("请输入 asset job id；不会假设任务完成。");
    return;
  }

  try {
    ports.writeAssetJob(createAssetJobViewModel(await ports.runThemeAssetJob(jobId)).summary);
  } catch (error) {
    ports.writeAssetJob(formatAdminApiError(error));
  }
}

async function renderReview(packageId: string, ports: AdminBrowserWorkflowPorts): Promise<void> {
  try {
    ports.writeReview(createAdminReviewViewModel(await ports.getPublishReview(packageId)));
  } catch (error) {
    ports.writeReviewError(formatAdminApiError(error));
  }
}

async function submitPublish(options: {
  readonly packageId: string;
  readonly semver: string;
  readonly ports: AdminBrowserWorkflowPorts;
}): Promise<void> {
  try {
    const version = await options.ports.publishDraft(options.packageId, options.semver);
    options.ports.writePublishStatus(createPublishResultMessage(version));
  } catch (error) {
    options.ports.writePublishStatus(formatAdminApiError(error));
  }
}

async function renderAssetJob(jobId: string, ports: AdminBrowserWorkflowPorts): Promise<void> {
  ports.writeAssetJob("Asset job 查询中...");

  try {
    const viewModel = createAssetJobViewModel(await ports.getThemeAssetJob(jobId));
    ports.writeAssetJob(viewModel.summary);
  } catch (error) {
    ports.writeAssetJob(formatAdminApiError(error));
  }
}

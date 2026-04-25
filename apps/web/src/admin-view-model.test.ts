import { describe, expect, it } from "vitest";
import { createAdminReviewViewModel, createAssetJobViewModel, createPublishResultMessage, formatAdminApiError, summarizeAssetJob } from "./admin-view-model.js";
import { ApiClientError, type PublishReviewSummary } from "./api-client.js";

const baseReview: PublishReviewSummary = {
  packageId: "pkg_1",
  title: "发布审核样例",
  packageCode: "publish_case",
  readyForPublish: false,
  checks: {
    qualityGate: { readyForPublish: false, summary: { errors: 1, warnings: 2, info: 3 }, diagnostics: [] },
    goldenRegression: {
      passed: false,
      total: 2,
      failed: 1,
      failures: [{ name: "fog-harbor-demo", differences: ["title drift"], qualityReadyForPublish: true }],
    },
  },
  blockers: [
    { source: "quality_gate", code: "invalid_script_package", path: "$", message: "roles missing" },
    { source: "golden_regression", code: "golden_package_drift", path: "fog-harbor-demo", message: "title drift" },
  ],
};

describe("admin view model", () => {
  it("summarizes readiness, blockers, golden regression, and quality counts", () => {
    const model = createAdminReviewViewModel(baseReview);

    expect(model.readiness).toBe("未就绪：2 个发布阻断项");
    expect(model.qualityCounts).toBe("Quality Gate：1 errors / 2 warnings / 3 info");
    expect(model.goldenRegression).toBe("Golden Regression：1/2 failed");
    expect(model.blockers).toEqual([
      "quality_gate invalid_script_package @ $：roles missing",
      "golden_regression golden_package_drift @ fog-harbor-demo：title drift",
    ]);
  });

  it("summarizes completed and failed asset jobs explicitly", () => {
    expect(
      createAssetJobViewModel({
        jobId: "job_2",
        status: "completed",
        requestedAssets: [{ id: "cover" }],
        generatedAssets: [{ assetCode: "cover", uri: "asset://cover.png", provider: "test" }],
      }).generatedAssets,
    ).toEqual(["cover -> asset://cover.png @ test"]);

    expect(
      summarizeAssetJob({
        jobId: "job_3",
        status: "failed",
        requestedAssets: [{ id: "cover" }],
        failure: { code: "ProviderDown", message: "offline" },
      }),
    ).toContain("failure ProviderDown: offline");
  });

  it("formats explicit publish results for operators", () => {
    expect(createPublishResultMessage({ id: "version_1", semver: "1.0.0", state: "released" })).toBe(
      "发布成功：version_1 / 1.0.0 / released",
    );
  });

  it("includes structured API error details for visible admin failures", () => {
    const error = new ApiClientError(409, {
      error: "PublishGateBlocked",
      message: "Publish blocked",
      blockers: [{ code: "invalid_script_package" }],
    });

    expect(formatAdminApiError(error)).toContain("409 PublishGateBlocked: Publish blocked");
    expect(formatAdminApiError(error)).toContain("invalid_script_package");
  });
});

import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { ContentService } from "../content/content-service.js";
import { QualityGate } from "./quality-gate.js";
import { PublishReviewController } from "./publish-review.controller.js";

const draftContent = {
  package_code: "publish_case",
  title: "发布审核样例",
  status: "released" as const,
  roles: [{ role_code: "detective", name: "侦探", public_profile: "调查旧案。" }],
  clues: [],
  scenes: [
    {
      scene_code: "intro",
      phase: "intro" as const,
      visible_to: [{ kind: "public" as const, value: "all" }],
      entry_if: [],
      actions: [],
      end_if: [{ op: "timer_expired" as const }],
      win_rule_hooks: [],
    },
  ],
};

describe("PublishReviewController", () => {
  it("exposes read-only publish review route metadata", () => {
    const handler = PublishReviewController.prototype.getPublishReview;

    expect(Reflect.getMetadata(PATH_METADATA, PublishReviewController)).toBe(
      "creation/publish-review",
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe("packages/:packageId");
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
  });

  it("returns aggregated release governance summary", async () => {
    const controller = new PublishReviewController(
      {
        getPackage: async () => ({
          id: "pkg_1",
          currentDraft: { content: draftContent },
          releasedVersions: [],
        }),
      } as ContentService,
      new QualityGate(),
    );

    await expect(controller.getPublishReview("pkg_1")).resolves.toMatchObject({
      packageId: "pkg_1",
      packageCode: "publish_case",
      title: "发布审核样例",
      readyForPublish: false,
      checks: {
        qualityGate: {
          readyForPublish: false,
          summary: { errors: 1, warnings: 0, info: 0 },
        },
        goldenRegression: {
          passed: true,
          total: 1,
          failed: 0,
          failures: [],
        },
      },
      blockers: [
        {
          source: "quality_gate",
          code: "release_semver_required",
          path: "semver",
        },
      ],
    });
  });
});

import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { ContentService } from "../content/content-service.js";
import { QualityGate } from "./quality-gate.js";
import { ReviewWorkbenchController } from "./review-workbench.controller.js";

const draftContent = {
  package_code: "review_case",
  title: "审核样例",
  status: "draft" as const,
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

describe("ReviewWorkbenchController", () => {
  it("exposes package review route metadata", () => {
    const handler = ReviewWorkbenchController.prototype.getPackageReview;

    expect(Reflect.getMetadata(PATH_METADATA, ReviewWorkbenchController)).toBe(
      "creation/review-workbench",
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe("packages/:packageId");
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
  });

  it("returns structured human review summary", async () => {
    const controller = new ReviewWorkbenchController(
      { getPackage: async () => ({ id: "pkg_1", currentDraft: { content: draftContent }, releasedVersions: [] }) } as ContentService,
      new QualityGate(),
    );

    await expect(controller.getPackageReview("pkg_1")).resolves.toMatchObject({
      packageId: "pkg_1",
      draft: { title: "审核样例", packageCode: "review_case" },
      goldenRegressions: [{ name: "fog-harbor-demo" }],
    });
  });
});

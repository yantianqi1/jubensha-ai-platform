import { BadRequestException, ConflictException, NotFoundException, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit-service.js";
import { InMemoryAuditRepository } from "../audit/audit-repository.js";
import { ThemeAssetJobController } from "./theme-asset-job.controller.js";
import { ThemeAssetJobExecutor, ThemeAssetJobStore } from "./theme-asset-job.js";
import { ThemeAssetProviderError } from "./theme-asset-provider.js";

const ROOT_PATH = "creation/theme-assets/jobs";
const storyBibleInput = {
  meta: { title: "雾港失踪案", genre: "民国悬疑", player_count: 1, duration_minutes: 180, difficulty: "入门", supernatural_allowed: false },
  theme: { premise: "港口宅邸内的一场离奇失踪。", theme_statement: "旧案会吞没人心。", tone: "冷峻悬疑" },
  truth: { core_case: "宅邸主人离奇失踪。", killer_or_core_secret: "管家伪造现场。", timeline: [{ id: "truth_1", title: "伪造", summary: "伪造现场。" }] },
  characters: [{ id: "butler", name: "管家", public_profile: "沉默的宅邸管家。", private_secret: "知道真相。", goal: "保护秘密。", fear: "秘密曝光。", arc: "从沉默到崩溃。" }],
  clues: [{ id: "scratch", title: "划痕", content: "窗台划痕。", red_herring: false }],
  acts: [{ id: "act1", title: "初入宅邸", goal: "建立疑点。", scene_seeds: ["抵达宅邸。"] }],
  endings: [{ id: "truth", title: "真相", condition: "公开线索。", summary: "真相揭开。" }],
};

describe("ThemeAssetJobController", () => {
  it("exposes explicit asset job route metadata", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ThemeAssetJobController)).toBe(ROOT_PATH);
    expect(Reflect.getMetadata(PATH_METADATA, ThemeAssetJobController.prototype.createThemeAssetJob)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, ThemeAssetJobController.prototype.createThemeAssetJob)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, ThemeAssetJobController.prototype.runThemeAssetJob)).toBe(":jobId/run");
    expect(Reflect.getMetadata(METHOD_METADATA, ThemeAssetJobController.prototype.runThemeAssetJob)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, ThemeAssetJobController.prototype.getThemeAssetJob)).toBe(":jobId");
    expect(Reflect.getMetadata(METHOD_METADATA, ThemeAssetJobController.prototype.getThemeAssetJob)).toBe(RequestMethod.GET);
  });

  it("creates queued jobs from story bible input and returns requested assets", () => {
    const { controller } = createController();
    const job = controller.createThemeAssetJob({ storyBible: storyBibleInput });

    expect(job.status).toBe("queued");
    expect(job.requestedAssets.map((asset) => asset.asset_code)).toEqual(["cover", "character.butler", "clue.scratch"]);
    expect(controller.getThemeAssetJob(job.id)).toEqual(job);
  });

  it("runs queued jobs explicitly through the provider", async () => {
    const { controller, auditService } = createController();
    const job = controller.createThemeAssetJob({ storyBible: storyBibleInput });

    const completed = await controller.runThemeAssetJob(job.id, { "x-operator-id": "operator_1" });

    expect(completed.status).toBe("completed");
    expect(completed.generatedAssets[0]).toMatchObject({ assetCode: "cover", uri: "asset://cover.png" });
    await expect(auditService.listEvents({ targetType: "theme_asset_job", targetId: job.id })).resolves.toEqual([
      expect.objectContaining({ action: "run_asset_job", status: "succeeded" }),
    ]);
  });

  it("surfaces provider failures on the job", async () => {
    const { controller, auditService } = createController({ fail: true });
    const job = controller.createThemeAssetJob({ storyBible: storyBibleInput });

    const failed = await controller.runThemeAssetJob(job.id, { "x-operator-id": "operator_1" });

    expect(failed.status).toBe("failed");
    expect(failed.failure).toEqual({ code: "ProviderDown", message: "offline for cover" });
    await expect(auditService.listEvents({ targetType: "theme_asset_job", targetId: job.id })).resolves.toEqual([
      expect.objectContaining({ action: "run_asset_job", status: "failed" }),
    ]);
  });

  it("returns explicit conflicts when completed jobs are rerun", async () => {
    const { controller } = createController();
    const job = controller.createThemeAssetJob({ storyBible: storyBibleInput });

    await controller.runThemeAssetJob(job.id, { "x-operator-id": "operator_1" });

    await expect(controller.runThemeAssetJob(job.id, { "x-operator-id": "operator_1" })).rejects.toThrow(ConflictException);
  });

  it("requires operator identity to run asset jobs", async () => {
    const { controller } = createController();
    const job = controller.createThemeAssetJob({ storyBible: storyBibleInput });

    await expect(controller.runThemeAssetJob(job.id, {})).rejects.toThrow();
  });

  it("rejects requests without story bible input", () => {
    expect(() => createController().controller.createThemeAssetJob({})).toThrow(BadRequestException);
  });

  it("returns explicit not found errors for unknown jobs", async () => {
    const { controller } = createController();

    await expect(controller.runThemeAssetJob("missing_job", { "x-operator-id": "operator_1" })).rejects.toThrow(NotFoundException);
    expect(() => controller.getThemeAssetJob("missing_job")).toThrow(NotFoundException);
  });
});

function createController(options: { readonly fail?: boolean } = {}) {
  const store = new ThemeAssetJobStore();
  const provider = options.fail ? createFailingProvider() : createProvider();
  const auditService = new AuditService({
    repository: new InMemoryAuditRepository(),
    idGenerator: () => "audit_1",
    now: () => "2026-04-25T00:00:00.000Z",
  });

  return {
    controller: new ThemeAssetJobController(store, new ThemeAssetJobExecutor(store, provider), auditService),
    auditService,
  };
}

function createProvider() {
  return {
    async generateAsset(asset: { asset_code: string }) {
      return { assetCode: asset.asset_code, uri: `asset://${asset.asset_code}.png`, provider: "test" };
    },
  };
}

function createFailingProvider() {
  return {
    async generateAsset(asset: { asset_code: string }): Promise<never> {
      throw new ThemeAssetProviderError("ProviderDown", `offline for ${asset.asset_code}`);
    },
  };
}

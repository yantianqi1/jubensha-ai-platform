import { parseStoryBible } from "@jubensha/dsl";
import { describe, expect, it } from "vitest";
import { compileThemeAssets } from "./theme-asset-compiler.js";
import { ThemeAssetJobExecutor, ThemeAssetJobStore } from "./theme-asset-job.js";

const STORY_BIBLE_INPUT = {
  meta: {
    title: "雾港回声",
    genre: "民国悬疑",
    player_count: 4,
    duration_minutes: 180,
    difficulty: "intermediate",
    supernatural_allowed: false,
  },
  theme: {
    premise: "一座海港宅邸在暴雨夜重启旧案。",
    theme_statement: "真相会惩罚每个逃避责任的人。",
    tone: "冷峻、克制、压迫",
  },
  truth: {
    core_case: "港口账本失窃后，见证人被杀。",
    killer_or_core_secret: "管家为了保护旧主伪造了死亡时间。",
    timeline: [{ id: "T-01", title: "停电", summary: "宅邸突然停电。" }],
  },
  characters: [
    {
      id: "butler",
      name: "沈管家",
      public_profile: "服侍宅邸二十年的老管家。",
      private_secret: "知道主人死亡的真实时间。",
      goal: "保护小姐继承权。",
      fear: "旧案牵出自己的伪证。",
      arc: "从沉默守秘到主动承认伪证。",
    },
  ],
  clues: [{ id: "C-01", title: "停摆怀表", content: "怀表停在停电前十分钟。", red_herring: false }],
  acts: [{ id: "A-01", title: "暴雨晚宴", goal: "建立不在场证明。", scene_seeds: ["餐厅"] }],
  endings: [{ id: "E-TRUE", title: "真相公开", condition: "指出伪造时间。", summary: "管家承认伪证。" }],
};

describe("ThemeAssetJobStore", () => {
  it("creates queued asset generation job records from story bible manifests", () => {
    const { store, job, manifest } = createQueuedJob();

    expect(job).toMatchObject({
      id: "theme_asset_job_1",
      storyTitle: "雾港回声",
      status: "queued",
      requestedAssets: manifest.assets,
      generatedAssets: [],
    });
    expect(job).not.toHaveProperty("assets");
    expect(store.getJob(job.id)).toEqual(job);
  });

  it("runs jobs through a provider and records completed assets", async () => {
    const { store, job } = createQueuedJob();
    const executor = new ThemeAssetJobExecutor(store, createProvider());

    const completed = await executor.runJob(job.id);

    expect(completed).toMatchObject({ id: job.id, status: "completed" });
    expect(completed?.generatedAssets.map((asset) => asset.assetCode)).toEqual([
      "cover",
      "character.butler",
      "clue.C-01",
    ]);
  });

  it("marks provider failures explicitly", async () => {
    const { store, job } = createQueuedJob();
    const executor = new ThemeAssetJobExecutor(store, {
      async generateAsset(asset) {
        throw new Error(`down for ${asset.asset_code}`);
      },
    });

    const failed = await executor.runJob(job.id);

    expect(failed).toMatchObject({
      id: job.id,
      status: "failed",
      failure: { code: "ThemeAssetProviderError", message: "down for cover" },
      generatedAssets: [],
    });
  });
});

function createQueuedJob() {
  const storyBible = parseStoryBible(STORY_BIBLE_INPUT);
  const manifest = compileThemeAssets(storyBible);
  const store = new ThemeAssetJobStore();
  const job = store.createJob({ storyBible, manifest });

  return { store, job, manifest };
}

function createProvider() {
  return {
    async generateAsset(asset: { asset_code: string }) {
      return { assetCode: asset.asset_code, uri: `asset://${asset.asset_code}.png`, provider: "test" };
    },
  };
}

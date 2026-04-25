import { BadRequestException, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { ThemeAssetsController } from "./theme-assets.controller.js";

const ROOT_PATH = "creation/theme-assets";
const COMPILE_PATH = "compile";

const storyBibleInput = {
  meta: {
    title: "雾港失踪案",
    genre: "民国悬疑",
    player_count: 1,
    duration_minutes: 180,
    difficulty: "入门",
    supernatural_allowed: false,
  },
  theme: {
    premise: "港口宅邸内的一场离奇失踪。",
    theme_statement: "旧案会吞没人心。",
    tone: "冷峻悬疑",
  },
  truth: {
    core_case: "宅邸主人离奇失踪。",
    killer_or_core_secret: "管家伪造现场。",
    timeline: [{ id: "truth_1", title: "伪造", summary: "伪造现场。" }],
  },
  characters: [
    {
      id: "butler",
      name: "管家",
      public_profile: "沉默的宅邸管家。",
      private_secret: "知道真相。",
      goal: "保护秘密。",
      fear: "秘密曝光。",
      arc: "从沉默到崩溃。",
    },
  ],
  clues: [
    {
      id: "scratch",
      title: "划痕",
      content: "窗台划痕。",
      red_herring: false,
    },
  ],
  acts: [{ id: "act1", title: "初入宅邸", goal: "建立疑点。", scene_seeds: ["抵达宅邸。"] }],
  endings: [{ id: "truth", title: "真相", condition: "公开线索。", summary: "真相揭开。" }],
};

describe("ThemeAssetsController", () => {
  it("exposes explicit theme asset compile route metadata", () => {
    const handler = ThemeAssetsController.prototype.compileThemeAssets;

    expect(Reflect.getMetadata(PATH_METADATA, ThemeAssetsController)).toBe(ROOT_PATH);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(COMPILE_PATH);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
  });

  it("returns deterministic theme asset manifest from story bible input", () => {
    const controller = new ThemeAssetsController();
    const firstManifest = controller.compileThemeAssets({ storyBible: storyBibleInput });
    const secondManifest = controller.compileThemeAssets({ storyBible: storyBibleInput });

    expect(secondManifest).toEqual(firstManifest);
    expect(firstManifest).toMatchObject({
      story_title: "雾港失踪案",
      theme_token: { tone: "冷峻悬疑", motifs: ["民国悬疑", "初入宅邸", "划痕"] },
      assets: [
        { asset_code: "cover", kind: "cover" },
        { asset_code: "character.butler", kind: "character" },
        { asset_code: "clue.scratch", kind: "clue" },
      ],
    });
  });

  it("rejects requests without story bible input", () => {
    const controller = new ThemeAssetsController();

    expect(() => controller.compileThemeAssets({})).toThrow(BadRequestException);
  });
});

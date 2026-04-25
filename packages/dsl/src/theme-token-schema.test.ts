import { describe, expect, it } from "vitest";
import {
  parseThemeAssetManifest,
  parseThemeToken,
  safeParseThemeAssetManifest,
} from "./theme-token-schema.js";

const THEME_TOKEN_INPUT = {
  tone: "冷峻、克制、压迫",
  palette: {
    primary: "#1f2937",
    secondary: "#334155",
    accent: "#b45309",
    background: "#f8fafc",
  },
  motifs: ["暴雨", "港口", "停摆怀表"],
  cover_direction: {
    headline: "雾港回声",
    composition: "暴雨中的海港宅邸与窗前剪影",
    lighting: "低调侧光",
    mood: "悬疑压迫",
  },
  character_portrait_cues: {
    butler: {
      costume: "旧式深色管家制服",
      expression: "克制紧绷",
      prop: "停摆怀表",
      palette_role: "secondary",
    },
  },
  clue_visual_cues: {
    "C-01": {
      object: "停摆怀表",
      condition: "表盘有潮湿雾气",
      material: "黄铜与旧皮革",
      symbolic_meaning: "被伪造的死亡时间",
    },
  },
};

describe("ThemeTokenSchema", () => {
  it("parses reusable theme tokens", () => {
    const themeToken = parseThemeToken(THEME_TOKEN_INPUT);

    expect(themeToken.motifs).toEqual(["暴雨", "港口", "停摆怀表"]);
    expect(themeToken.character_portrait_cues.butler?.palette_role).toBe("secondary");
  });

  it("parses asset manifests and rejects duplicate asset codes", () => {
    const manifest = parseThemeAssetManifest({
      story_title: "雾港回声",
      theme_token: THEME_TOKEN_INPUT,
      assets: [
        {
          asset_code: "cover",
          kind: "cover",
          prompt: "暴雨中的海港宅邸封面",
          theme_motifs: ["暴雨", "港口"],
        },
      ],
    });
    const duplicateResult = safeParseThemeAssetManifest({
      ...manifest,
      assets: [manifest.assets[0], manifest.assets[0]],
    });

    expect(manifest.assets[0]?.kind).toBe("cover");
    expect(duplicateResult.success).toBe(false);
    expect(duplicateResult.error?.issues[0]?.message).toContain("Duplicate asset_code");
  });
});

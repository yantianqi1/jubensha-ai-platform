import { parseStoryBible } from "@jubensha/dsl";
import { describe, expect, it } from "vitest";
import { CreationService } from "./creation-service.js";

const storyBibleInput = {
  meta: {
    title: "雾港失踪案",
    genre: "mystery",
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
    timeline: [{ id: "truth_1", title: "伪造", summary: "伪造现场。", actor_ids: ["butler"] }],
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
      source_character_ids: ["butler"],
      red_herring: false,
    },
  ],
  acts: [
    { id: "act1", title: "初入宅邸", goal: "建立疑点。", scene_seeds: ["抵达宅邸。"] },
  ],
  endings: [
    { id: "truth", title: "真相", condition: "公开线索。", summary: "真相揭开。" },
  ],
};

describe("CreationService", () => {
  it("validates and persists compiled draft packages through injected writer", async () => {
    const storyBible = parseStoryBible(storyBibleInput);
    const service = new CreationService({
      draftWriter: {
        createDraftPackage: async (scriptPackage) => ({
          id: "pkg_1",
          currentDraft: { content: scriptPackage },
          releasedVersions: [],
        }),
      },
    });

    const result = await service.createDraftFromStoryBible(storyBible);

    expect(result.draftPackage.id).toBe("pkg_1");
    expect(result.draftPackage.currentDraft.content.package_code).toBe("story_bible_draft");
    expect(result.draftPackage.currentDraft.content.scenes).toHaveLength(2);
    expect(result.draftPackage.currentDraft.content.meta?.truth).toBe("管家伪造现场。");
    expect(result.flowDiagnostics).toEqual([]);
    expect(result.simulationDiagnostics).toEqual([]);
  });
});

import {
  parseScriptPackage,
  parseStoryBible,
  validateScriptPackageReferences,
} from "@jubensha/dsl";
import { describe, expect, it } from "vitest";
import { compileStoryBibleToScriptPackage } from "./story-bible-to-script-compiler.js";

const validStoryBibleInput = {
  meta: {
    title: "雾港失踪案",
    genre: "mystery",
    player_count: 2,
    duration_minutes: 180,
    difficulty: "入门",
    supernatural_allowed: false,
  },
  theme: {
    premise: "港口宅邸内的一场离奇失踪。",
    theme_statement: "每个人都在为旧案付出代价。",
    tone: "冷峻悬疑",
  },
  truth: {
    core_case: "宅邸主人离奇失踪。",
    killer_or_core_secret: "管家伪造现场以掩盖旧案。",
    timeline: [
      {
        id: "truth_1",
        title: "伪造现场",
        summary: "管家在窗台留下误导性划痕。",
        actor_ids: ["butler"],
        reveals_truth_ids: [],
      },
    ],
  },
  characters: [
    {
      id: "butler",
      name: "管家",
      public_profile: "沉默的宅邸管家。",
      private_secret: "知道港口旧案真相。",
      goal: "保护旧案秘密。",
      fear: "旧案曝光。",
      arc: "从沉默到崩溃。",
      relations: [],
    },
    {
      id: "doctor",
      name: "医生",
      public_profile: "被请来验伤的医生。",
      private_secret: "曾参与旧案诊断。",
      goal: "查清失踪原因。",
      fear: "职业声誉受损。",
      arc: "从旁观到承担。",
      relations: [],
    },
  ],
  clues: [
    {
      id: "window_scratch",
      title: "窗台划痕",
      content: "窗台上有一道新鲜划痕。",
      source_character_ids: ["butler"],
      reveals_truth_ids: ["truth_1"],
      red_herring: false,
      unlock_conditions: [{ op: "flag_true", flag: "intro_complete" }],
      knowledge_scope: [{ kind: "role", value: "butler" }],
    },
  ],
  acts: [
    {
      id: "act1",
      title: "初入宅邸",
      goal: "建立现场疑点。",
      scene_seeds: ["医生抵达宅邸。"],
      scenes: [
        {
          id: "dining_blackout",
          title: "餐厅停电",
          objective: "让玩家发现窗台划痕。",
          entry_conditions: [{ op: "flag_true", flag: "intro_complete" }],
          expected_reveals: ["window_scratch"],
          available_actions: [
            {
              id: "inspect_window",
              label: "检查窗台",
              unlock_conditions: [],
              reveals_clue_ids: ["window_scratch"],
            },
          ],
        },
      ],
    },
  ],
  endings: [
    {
      id: "truth",
      title: "真相揭开",
      condition: "公开关键线索。",
      conditions: [{ op: "clue_revealed", clue_code: "window_scratch" }],
      summary: "玩家指出窗台划痕与管家的旧案有关。",
    },
  ],
};

describe("compileStoryBibleToScriptPackage", () => {
  it("compiles a valid story bible into a valid draft script package", () => {
    const storyBible = parseStoryBible(validStoryBibleInput);
    const scriptPackage = compileStoryBibleToScriptPackage(storyBible);

    expect(scriptPackage.status).toBe("draft");
    expect(scriptPackage.title).toBe("雾港失踪案");
    expect(scriptPackage.roles.map((role) => role.role_code)).toEqual(["butler", "doctor"]);
    expect(scriptPackage.clues.map((clue) => clue.clue_code)).toEqual(["window_scratch"]);
    expect(scriptPackage.scenes.map((scene) => scene.phase)).toEqual(["intro", "investigation"]);
    expect(parseScriptPackage(scriptPackage)).toEqual(scriptPackage);
    expect(validateScriptPackageReferences(scriptPackage)).toEqual([]);
  });

  it("compiles structured story scenes into playable investigation actions", () => {
    const storyBible = parseStoryBible(validStoryBibleInput);
    const scriptPackage = compileStoryBibleToScriptPackage(storyBible);

    expect(scriptPackage.clues[0]).toMatchObject({
      clue_code: "window_scratch",
      initial_visibility: [{ kind: "role", value: "butler" }],
      unlock_if: [{ op: "flag_true", flag: "intro_complete" }],
    });
    expect(scriptPackage.scenes[1]).toMatchObject({
      scene_code: "dining_blackout",
      title: "餐厅停电",
      entry_if: [{ op: "flag_true", flag: "intro_complete" }],
      actions: [
        {
          code: "inspect_window",
          label: "检查窗台",
          allow_if: [],
          effect: [{ type: "reveal_clue", clue_code: "window_scratch" }],
        },
      ],
      end_if: [{ op: "clue_revealed", clue_code: "window_scratch" }],
      win_rule_hooks: ["truth"],
    });
    expect(scriptPackage.meta?.truth).toBe("管家伪造现场以掩盖旧案。");
  });
});

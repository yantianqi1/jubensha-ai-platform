import { describe, expect, it } from "vitest";
import { parseStoryBible, safeParseStoryBible, type StoryBible } from "./story-bible-schema.js";

const PLAYER_COUNT = 4;
const DURATION_MINUTES = 180;

const STORY_BIBLE_INPUT = {
  meta: {
    title: "雾港回声",
    genre: "民国悬疑",
    player_count: PLAYER_COUNT,
    duration_minutes: DURATION_MINUTES,
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
    timeline: [
      {
        id: "T-01",
        title: "停电",
        summary: "宅邸在晚宴后突然停电。",
        actor_ids: ["butler"],
        reveals_truth_ids: ["truth-time"],
      },
    ],
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
      relations: [{ target_character_id: "heiress", summary: "视她为旧主血脉。" }],
    },
    {
      id: "heiress",
      name: "林小姐",
      public_profile: "刚回国的继承人。",
      private_secret: "偷偷调查过港口账本。",
      goal: "找出父亲死亡真相。",
      fear: "自己继承资格被否定。",
      arc: "从自保转向公开真相。",
      relations: [{ target_character_id: "butler", summary: "信任但有所隐瞒。" }],
    },
  ],
  clues: [
    {
      id: "C-01",
      title: "停摆怀表",
      content: "怀表停在停电前十分钟。",
      source_character_ids: ["butler"],
      reveals_truth_ids: ["truth-time"],
      red_herring: false,
      unlock_conditions: [{ op: "flag_true", flag: "intro_complete" }],
      knowledge_scope: [{ kind: "role", value: "butler" }],
    },
  ],
  acts: [
    {
      id: "A-01",
      title: "暴雨晚宴",
      goal: "建立每个角色的不在场证明。",
      scene_seeds: ["餐厅", "书房", "停电后的走廊"],
      scenes: [
        {
          id: "S-01",
          title: "餐厅停电",
          objective: "让玩家确认停电前后的行动线。",
          entry_conditions: [{ op: "flag_true", flag: "intro_complete" }],
          expected_reveals: ["C-01"],
          available_actions: [
            {
              id: "inspect-watch",
              label: "检查怀表",
              reveals_clue_ids: ["C-01"],
            },
          ],
        },
      ],
    },
  ],
  endings: [
    {
      id: "E-TRUE",
      title: "真相公开",
      condition: "玩家指出死亡时间被伪造。",
      conditions: [{ op: "clue_revealed", clue_code: "C-01" }],
      summary: "管家承认伪证，继承人公开账本。",
    },
  ],
};

function buildStoryBible(overrides: Partial<StoryBible> = {}): StoryBible {
  return parseStoryBible({ ...STORY_BIBLE_INPUT, ...overrides });
}

describe("StoryBibleSchema", () => {
  it("parses a complete story bible", () => {
    const storyBible = buildStoryBible();

    expect(storyBible.meta.title).toBe("雾港回声");
    expect(storyBible.characters.map((character) => character.id)).toEqual([
      "butler",
      "heiress",
    ]);
  });

  it("rejects duplicate character ids", () => {
    const storyBible = buildStoryBible();
    const result = safeParseStoryBible({
      ...storyBible,
      characters: [storyBible.characters[0], { ...storyBible.characters[1], id: "butler" }],
    });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues).toContainEqual(
      expect.objectContaining({ message: "Duplicate characters id: butler" }),
    );
  });

  it("requires positive player count and duration", () => {
    const storyBible = buildStoryBible();
    const result = safeParseStoryBible({
      ...storyBible,
      meta: { ...storyBible.meta, player_count: 0, duration_minutes: 0 },
    });

    expect(result.success).toBe(false);
  });

  it("parses structured scene actions, clue scopes, and ending conditions", () => {
    const storyBible = buildStoryBible();

    expect(storyBible.clues[0].unlock_conditions).toEqual([
      { op: "flag_true", flag: "intro_complete" },
    ]);
    expect(storyBible.clues[0].knowledge_scope).toEqual([{ kind: "role", value: "butler" }]);
    expect(storyBible.acts[0].scenes[0].available_actions[0]).toEqual({
      id: "inspect-watch",
      label: "检查怀表",
      unlock_conditions: [],
      reveals_clue_ids: ["C-01"],
    });
    expect(storyBible.endings[0].conditions).toEqual([{ op: "clue_revealed", clue_code: "C-01" }]);
  });
});

import { describe, expect, it } from "vitest";
import { parseStoryBible, type StoryBible } from "./story-bible-schema.js";
import { validateStoryBibleReferences } from "./story-bible-validation.js";

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
      unlock_conditions: [],
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
          entry_conditions: [],
          expected_reveals: ["C-01"],
          available_actions: [
            {
              id: "inspect-watch",
              label: "检查怀表",
              unlock_conditions: [],
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

describe("validateStoryBibleReferences", () => {
  it("returns no diagnostics for valid character references", () => {
    expect(validateStoryBibleReferences(buildStoryBible())).toEqual([]);
  });

  it("reports missing timeline actors", () => {
    const storyBible = buildStoryBible();

    const invalidStoryBible = buildStoryBible({
      truth: {
        ...storyBible.truth,
        timeline: [{ ...storyBible.truth.timeline[0], actor_ids: ["missing_actor"] }],
      },
    });

    expect(validateStoryBibleReferences(invalidStoryBible)).toEqual([
      {
        severity: "error",
        code: "missing_character",
        path: "truth.timeline.T-01.actor_ids[0]",
        message: "Missing character reference: missing_actor",
      },
    ]);
  });

  it("reports missing relation targets", () => {
    const storyBible = buildStoryBible({
      characters: buildCharactersWithMissingRelation(),
    });

    expect(validateStoryBibleReferences(storyBible)).toEqual([
      {
        severity: "error",
        code: "missing_character",
        path: "characters.butler.relations[0].target_character_id",
        message: "Missing character reference: ghost",
      },
    ]);
  });

  it("reports missing clue source characters", () => {
    const storyBible = buildStoryBible({
      clues: buildCluesWithMissingSource(),
    });

    expect(validateStoryBibleReferences(storyBible)).toEqual([
      {
        severity: "error",
        code: "missing_character",
        path: "clues.C-01.source_character_ids[0]",
        message: "Missing character reference: unknown_source",
      },
    ]);
  });

  it("reports missing clue references in scenes and endings", () => {
    const storyBible = buildStoryBible({ acts: buildActsWithMissingClue() });

    expect(validateStoryBibleReferences(storyBible)).toEqual([
      {
        severity: "error",
        code: "missing_clue",
        path: "acts.A-01.scenes.S-01.expected_reveals[0]",
        message: "Missing clue reference: missing-clue",
      },
      {
        severity: "error",
        code: "missing_clue",
        path: "acts.A-01.scenes.S-01.available_actions.inspect-watch.reveals_clue_ids[0]",
        message: "Missing clue reference: missing-clue",
      },
    ]);
  });

  it("reports missing role scopes on clue knowledge", () => {
    const storyBible = buildStoryBible({ clues: buildCluesWithMissingScopeRole() });

    expect(validateStoryBibleReferences(storyBible)).toEqual([
      {
        severity: "error",
        code: "missing_character",
        path: "clues.C-01.knowledge_scope[0]",
        message: "Missing character reference: ghost",
      },
    ]);
  });
});

function buildCharactersWithMissingRelation(): StoryBible["characters"] {
  const storyBible = buildStoryBible();

  return [
    {
      ...storyBible.characters[0],
      relations: [{ target_character_id: "ghost", summary: "不存在的人。" }],
    },
    storyBible.characters[1],
  ];
}

function buildCluesWithMissingSource(): StoryBible["clues"] {
  const storyBible = buildStoryBible();

  return [
    {
      ...storyBible.clues[0],
      source_character_ids: ["unknown_source"],
    },
  ];
}

function buildCluesWithMissingScopeRole(): StoryBible["clues"] {
  const storyBible = buildStoryBible();

  return [
    {
      ...storyBible.clues[0],
      knowledge_scope: [{ kind: "role", value: "ghost" }],
    },
  ];
}

function buildActsWithMissingClue(): StoryBible["acts"] {
  const storyBible = buildStoryBible();
  const act = storyBible.acts[0];
  const scene = act.scenes[0];
  const action = scene.available_actions[0];

  return [
    {
      ...act,
      scenes: [
        {
          ...scene,
          expected_reveals: ["missing-clue"],
          available_actions: [{ ...action, reveals_clue_ids: ["missing-clue"] }],
        },
      ],
    },
  ];
}

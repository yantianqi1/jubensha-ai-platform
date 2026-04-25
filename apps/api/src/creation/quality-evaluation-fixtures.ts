import { parseStoryBible, type StoryBible } from "@jubensha/dsl";
import type { CriticDiagnostic } from "./story-critic-agent.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";

export interface GoldenScriptQualityBriefFixture {
  readonly id: string;
  readonly brief: StoryPlannerInput;
  readonly constraints: readonly string[];
  readonly forbiddenElements: readonly string[];
}

export const goldenScriptQualityBriefs: readonly GoldenScriptQualityBriefFixture[] = [
  createBrief("hardboiled_detective_4p", "雨夜侦探社收到匿名录音。", 4, "hardboiled detective", false),
  createBrief("emotional_family_secret_5p", "遗产晚宴揭开三代人的沉默。", 5, "family secret", false),
  createBrief("campus_mystery_6p", "校庆前夜，实验楼奖杯离奇失踪。", 6, "campus mystery", false),
  createBrief("closed_room_murder_5p", "雪山别墅密室中发现失踪收藏家。", 5, "closed room", false),
  createBrief("comedy_light_mystery_4p", "社区剧团首演道具被调包。", 4, "light comedy mystery", false),
  createBrief("faction_intrigue_6p", "商会选举前夜，两派盟约同时破裂。", 6, "faction intrigue", false),
  createBrief("supernatural_optional_mystery_5p", "旧戏台传出亡者唱段，但线索必须可物证解释。", 5, "optional supernatural", true),
  createBrief("minimal_invalid_or_edge_case", "只有一句话的极简委托。", 1, "edge case", false),
];

export const scriptQualityStoryBibles = {
  highQualityValid: buildStoryBible("high_quality_valid", "雾港录音案", 4),
  weakClueCoverage: buildStoryBible("weak_clue_coverage", "旧宅回声", 4, { weakClues: true }),
  referenceErrors: buildStoryBible("reference_errors", "断桥名单", 5, { referenceErrors: true }),
  missingClueChain: buildStoryBible("missing_clue_chain", "空盒谜案", 4, { missingClues: true }),
  privateInfoLeakageRisk: buildStoryBible("private_info_leakage", "茶会暗语", 5, { privateLeak: true }),
  criticBlocked: buildStoryBible("critic_blocked", "未闭合动机", 5),
  compilesButFailsQualityGate: buildStoryBible("quality_gate_blocked", "错位证词", 4, { missingRevealReference: true }),
} as const;

export const scriptQualityCriticDiagnostics = {
  criticBlocked: [{ severity: "error", code: "motive_gap", path: "truth.killer_or_core_secret", message: "核心动机不足以支撑凶手行动。" }],
  weakClueCoverage: [{ severity: "warning", code: "weak_clue_coverage", path: "clues", message: "关键真相只有单一线索支撑。" }],
} satisfies Record<string, readonly CriticDiagnostic[]>;

interface StoryBibleOptions {
  readonly weakClues?: boolean;
  readonly referenceErrors?: boolean;
  readonly missingClues?: boolean;
  readonly privateLeak?: boolean;
  readonly missingRevealReference?: boolean;
}

function createBrief(
  id: string,
  premise: string,
  playerCount: number,
  genre: string,
  supernaturalAllowed: boolean,
): GoldenScriptQualityBriefFixture {
  return {
    id,
    brief: {
      title: id,
      premise,
      playerCount,
      genre,
      tone: genre.includes("comedy") ? "轻松" : "悬疑",
      difficulty: playerCount > 5 ? "hard" : "medium",
      durationMinutes: playerCount > 4 ? 180 : 150,
      supernaturalAllowed,
    },
    constraints: ["必须有可追溯真相", "至少一个可互动调查场景"],
    forbiddenElements: ["不可自动发布", "不可创建运行房间"],
  };
}

function buildStoryBible(
  idPrefix: string,
  title: string,
  playerCount: number,
  options: StoryBibleOptions = {},
): StoryBible {
  return parseStoryBible({
    meta: createMeta(title, playerCount),
    theme: createTheme(title),
    truth: createTruth(idPrefix, options.referenceErrors),
    characters: createCharacters(options.referenceErrors, options.privateLeak),
    clues: createClues(idPrefix, options),
    acts: [createAct(idPrefix, options)],
    endings: [createEnding(idPrefix)],
  });
}

function createMeta(title: string, playerCount: number) {
  return { title, genre: "mystery", player_count: playerCount, duration_minutes: 180, difficulty: "medium", supernatural_allowed: false };
}

function createTheme(title: string) {
  return { premise: `${title}围绕旧案证词展开。`, theme_statement: "隐瞒越久，真相越重。", tone: "冷峻克制" };
}

function createTruth(idPrefix: string, referenceErrors?: boolean) {
  return {
    core_case: "档案管理员在停电夜伪造失踪现场。",
    killer_or_core_secret: "管理员为掩盖多年前调包档案，设计了假失踪。",
    timeline: [{ id: `${idPrefix}_truth`, title: "停电调包", summary: "停电时档案被替换。", actor_ids: [referenceErrors ? "missing_actor" : "archivist"] }],
  };
}

function createCharacters(referenceErrors?: boolean, privateLeak?: boolean) {
  return [{
    id: "archivist",
    name: "沈档案",
    public_profile: privateLeak ? "公开资料直接写明他就是调包者。" : "档案馆管理员，熟悉所有旧卷宗。",
    private_secret: "他曾调换关键档案并伪造停电记录。",
    goal: "阻止旧档案重审。",
    fear: "当年的调包被公开。",
    arc: "从冷静遮掩到被证据逼迫承认。",
    relations: referenceErrors ? [{ target_character_id: "missing_witness", summary: "不存在的证人关系。" }] : [],
  }];
}

function createClues(idPrefix: string, options: StoryBibleOptions) {
  if (options.missingClues) {
    return [];
  }

  const clue = {
    id: `${idPrefix}_ledger`,
    title: "潮湿档案袋",
    content: "档案袋只有内侧潮湿，说明曾被短暂藏进水箱。",
    source_character_ids: [options.referenceErrors ? "missing_actor" : "archivist"],
    reveals_truth_ids: [`${idPrefix}_truth`],
    red_herring: false,
  };

  return options.weakClues ? [clue] : [clue, { ...clue, id: `${idPrefix}_fuse`, title: "烧黑保险丝", content: "保险丝被人为剪断后重新烧灼。" }];
}

function createAct(idPrefix: string, options: StoryBibleOptions) {
  const revealId = options.missingRevealReference ? "missing_clue" : `${idPrefix}_ledger`;
  return {
    id: "act1",
    title: "档案馆调查",
    goal: "确认停电与档案调包的关系。",
    scene_seeds: ["档案室", "水箱间"],
    scenes: [{
      id: "archive_room",
      title: "档案室",
      objective: "找到第一条物证链。",
      entry_conditions: [{ op: "flag_true", flag: "intro_complete" }],
      expected_reveals: [revealId],
      available_actions: [{ id: "inspect_folder", label: "检查档案袋", reveals_clue_ids: [revealId] }],
    }],
  };
}

function createEnding(idPrefix: string) {
  return {
    id: "truth",
    title: "档案复原",
    condition: "指出档案袋与停电记录的矛盾。",
    conditions: [{ op: "clue_revealed", clue_code: `${idPrefix}_ledger` }],
    summary: "玩家用物证还原调包过程。",
  };
}

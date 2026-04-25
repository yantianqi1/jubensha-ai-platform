import { describe, expect, it } from "vitest";
import type { StoryBible } from "@jubensha/dsl";
import {
  buildGenerateRequest,
  createInitialStudioForm,
  createStorySkeletonEditorState,
  formatAttemptSummary,
  formatCompileDraftOutput,
  formatDiffSummary,
  formatRelationEdges,
  formatRelationGraph,
  formatRetryDiffSummary,
} from "./studio-view-model.js";

const storyBible: StoryBible = {
  meta: {
    title: "雨夜钟楼",
    genre: "本格推理",
    player_count: 4,
    duration_minutes: 120,
    difficulty: "standard",
    supernatural_allowed: false,
  },
  theme: {
    premise: "钟楼晚宴后，收藏家离奇死亡。",
    theme_statement: "每个谎言都保护一个更深的真相。",
    tone: "冷峻",
  },
  truth: {
    core_case: "收藏家被熟人杀害。",
    killer_or_core_secret: "继承人隐藏了作案动机。",
    timeline: [{ id: "t1", title: "停电", summary: "钟楼停电。", actor_ids: ["heir"] }],
  },
  characters: [
    {
      id: "heir",
      name: "继承人",
      public_profile: "沉默的继承者。",
      private_secret: "欠下巨债。",
      goal: "继承遗产",
      fear: "债务曝光",
      arc: "从伪装到崩溃",
      relations: [{ target_character_id: "doctor", summary: "互相利用" }],
    },
    {
      id: "doctor",
      name: "医生",
      public_profile: "家族医生。",
      private_secret: "伪造过病历。",
      goal: "保住名誉",
      fear: "病历曝光",
      arc: "被迫坦白",
      relations: [],
    },
  ],
  clues: [
    {
      id: "c1",
      title: "怀表裂痕",
      content: "怀表停在停电时刻。",
      source_character_ids: ["heir"],
      reveals_truth_ids: ["t1"],
      red_herring: false,
    },
  ],
  acts: [{ id: "a1", title: "钟楼搜证", goal: "找出时间线", scene_seeds: ["钟楼大厅"] }],
  endings: [{ id: "e1", title: "真相揭晓", condition: "指出继承人", summary: "继承人认罪。" }],
};

describe("studio view model", () => {
  it("creates a default studio form", () => {
    expect(createInitialStudioForm()).toEqual({
      title: "",
      genre: "本格推理",
      playerCount: 4,
      durationMinutes: 120,
      difficulty: "standard",
      supernaturalAllowed: false,
      premise: "",
      tone: "悬疑",
      themeStatement: "",
    });
  });

  it("maps a studio form to a generation request", () => {
    const form = { ...createInitialStudioForm(), title: "雨夜钟楼", premise: "晚宴命案" };

    expect(buildGenerateRequest(form)).toEqual({
      title: "雨夜钟楼",
      genre: "本格推理",
      playerCount: 4,
      durationMinutes: 120,
      difficulty: "standard",
      supernaturalAllowed: false,
      premise: "晚宴命案",
      tone: "悬疑",
      themeStatement: "",
    });
  });

  it("summarizes attempts and diagnostics", () => {
    const summary = formatAttemptSummary({
      storyBible,
      attempts: [
        {
          attempt: 1,
          accepted: false,
          storyBible,
          criticDiagnostics: [{ severity: "error", code: "missing", message: "缺少关键线索" }],
          storyBibleDiagnostics: [{ severity: "warning", code: "thin_truth", message: "核心案件偏薄", path: "truth.core_case" }],
        },
        {
          attempt: 2,
          accepted: true,
          storyBible,
          criticDiagnostics: [],
          storyBibleDiagnostics: [],
        },
      ],
      criticDiagnostics: [{ severity: "warning", code: "thin", message: "角色动机偏弱" }],
      storyBibleDiagnostics: [{ severity: "info", code: "schema", message: "结构校验完成" }],
    });

    expect(summary).toContain("最新尝试：第 2 次 · 通过");
    expect(summary).toContain("总览：critic 1 条 / story bible 1 条");
    expect(summary).toContain("第 1 次 · 未通过");
    expect(summary).toContain("Critic diagnostics：1 条");
    expect(summary).toContain("StoryBible diagnostics：1 条");
    expect(summary).toContain("[warning] thin_truth @ truth.core_case：核心案件偏薄");
  });

  it("formats compile draft output as a readable summary before raw JSON", () => {
    const output = formatCompileDraftOutput({
      draftPackage: { id: "pkg_1", title: "雨夜钟楼", packageCode: "rain_tower" },
      flowDiagnostics: [{ severity: "error", code: "missing_scene", message: "缺少场景" }],
      simulationDiagnostics: [{ severity: "warning", code: "short_path", message: "路径偏短" }],
    });

    expect(output).toContain("草稿 pkg_1 · 雨夜钟楼 · rain_tower");
    expect(output).toContain("Flow diagnostics：1 条");
    expect(output).toContain("Simulation diagnostics：1 条");
    expect(output).toContain("原始响应 JSON");
    expect(output).toContain('"packageCode": "rain_tower"');
  });

  it("formats character relation edges", () => {
    expect(formatRelationEdges(storyBible)).toEqual(["继承人 -> 医生：互相利用"]);
  });

  it("formats a relation graph for rendering", () => {
    expect(formatRelationGraph(storyBible)).toContain("继承人 --互相利用--> 医生");
  });

  it("formats field-level diff summaries", () => {
    const next = {
      ...storyBible,
      meta: { ...storyBible.meta, title: "雪夜钟楼" },
      theme: { ...storyBible.theme, tone: "压抑" },
    };

    expect(formatDiffSummary(storyBible, next)).toEqual([
      "meta.title: 雨夜钟楼 -> 雪夜钟楼",
      "theme.tone: 冷峻 -> 压抑",
    ]);
  });

  it("formats retry diff summaries with a visible heading", () => {
    const next = { ...storyBible, meta: { ...storyBible.meta, title: "雪夜钟楼" } };

    expect(formatRetryDiffSummary(storyBible, next)).toBe("重试差异\nmeta.title: 雨夜钟楼 -> 雪夜钟楼");
  });

  it("creates editable story skeleton state", () => {
    const state = createStorySkeletonEditorState(storyBible);

    expect(state.status).toBe("骨架可编辑：2 个角色 / 1 条线索 / 1 幕");
    expect(JSON.parse(state.draftText)).toEqual({
      meta: storyBible.meta,
      theme: storyBible.theme,
      truth: storyBible.truth,
      characters: storyBible.characters,
      clues: storyBible.clues,
      acts: storyBible.acts,
      endings: storyBible.endings,
    });
  });
});

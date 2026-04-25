import type { ScriptCreationJobStage, ScriptCreationJobView } from "./script-creation-job-types.js";

const baseJob = {
  id: "job_demo_0427",
  title: "雾港旧账 · Script Creation Job",
  brief: "4 人、180 分钟、阴冷克制的港口旧案，LLM 负责戏剧表达，DSL 负责真相与权限。",
  storyBible: {
    premise: "雾港码头的旧账本牵出一场失踪案。",
    theme: "被隐瞒的旧债终会回到当事人身上。",
    characters: ["老船长", "码头会计", "失踪船主", "记者"],
  },
  criticReview: {
    verdict: "结构完整，需继续保留决定性证据闭环。",
    diagnostics: [
      { code: "critic_truth_chain", message: "核心秘密具备可追溯证据链。", severity: "info" },
      { code: "critic_pacing", message: "第二幕节奏可压缩，避免线索重复。", severity: "warning" },
    ],
  },
  draftPackage: { packageId: "draft_pkg_fog_harbor", acts: 3, scenes: 9, clues: 14 },
  qualityReport: {
    score: 92,
    diagnostics: [
      { code: "reference_integrity", message: "引用完整，无孤儿线索。", severity: "info" },
      { code: "truth_support", message: "结算真相有证据支撑。", severity: "info" },
    ],
  },
  errors: [],
} satisfies Omit<ScriptCreationJobView, "stage" | "progress" | "readyForPublish" | "activity">;

const stageMeta: Record<ScriptCreationJobStage, { readonly progress: number; readonly label: string }> = {
  queued: { progress: 8, label: "任务已排队，等待创建管线接管。" },
  received_brief: { progress: 12, label: "Brief 已接收，等待剧情规划。" },
  planning_story: { progress: 24, label: "StoryPlannerAgent 正在生成剧情圣经。" },
  criticizing_story: { progress: 42, label: "StoryCriticAgent 正在审阅剧情结构。" },
  compiling_draft: { progress: 62, label: "编译器正在生成 ScriptPackage 草稿。" },
  deterministic_review: { progress: 82, label: "确定性质量门正在验证引用、真相与流程。" },
  ready_for_review: { progress: 100, label: "草稿可进入人工发布审核。" },
  blocked: { progress: 88, label: "确定性问题阻断发布准备。" },
  failed: { progress: 36, label: "模型或 schema 输出失败，等待修复。" },
};

export const scriptCreationJobMockStates = Object.freeze({
  queued: createMockJob("queued", false),
  received_brief: createMockJob("received_brief", false),
  planning_story: createMockJob("planning_story", false),
  criticizing_story: createMockJob("criticizing_story", false),
  compiling_draft: createMockJob("compiling_draft", false),
  deterministic_review: createMockJob("deterministic_review", false),
  ready_for_review: createMockJob("ready_for_review", true),
  blocked: createBlockedJob(),
  failed: createFailedJob(),
});

export const defaultScriptCreationJob = scriptCreationJobMockStates.deterministic_review;

function createMockJob(stage: ScriptCreationJobStage, readyForPublish: boolean): ScriptCreationJobView {
  const meta = stageMeta[stage];
  return { ...baseJob, stage, progress: meta.progress, readyForPublish, activity: createActivity(stage) };
}

function createBlockedJob(): ScriptCreationJobView {
  const diagnostic = {
    code: "deterministic_error",
    message: "线索 clue_ledger 未覆盖最终结算所需的 truth_support。",
    severity: "error" as const,
  };
  return {
    ...createMockJob("blocked", false),
    qualityReport: { score: 58, diagnostics: [diagnostic] },
    errors: [diagnostic],
  };
}

function createFailedJob(): ScriptCreationJobView {
  const diagnostic = {
    code: "provider_schema_error",
    message: "StoryBible JSON 缺少 truth.core_case，未进入运行态。",
    severity: "error" as const,
  };
  const { criticReview, draftPackage, qualityReport, ...job } = createMockJob("failed", false);
  void criticReview;
  void draftPackage;
  void qualityReport;
  return { ...job, errors: [diagnostic] };
}

function createActivity(stage: ScriptCreationJobStage) {
  return [
    { time: "09:41", title: "Brief received", detail: baseJob.brief, severity: "info" as const },
    { time: "09:43", title: "Current stage", detail: stageMeta[stage].label, severity: "info" as const },
  ];
}

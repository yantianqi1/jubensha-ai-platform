import type { StoryBible } from "@jubensha/dsl";
import type {
  CompileStoryBibleDraftResult,
  StudioDiagnostic,
  StudioGenerateStoryBibleRequest,
  StudioGenerateStoryBibleResult,
  StudioGenerationAttempt,
} from "./api-client.js";

export interface StudioForm {
  readonly title: string;
  readonly genre: string;
  readonly playerCount: number;
  readonly durationMinutes: number;
  readonly difficulty: string;
  readonly supernaturalAllowed: boolean;
  readonly premise: string;
  readonly tone: string;
  readonly themeStatement: string;
}

export interface StorySkeletonEditorState {
  readonly draftText: string;
  readonly status: string;
}

const DEFAULT_PLAYER_COUNT = 4;
const DEFAULT_DURATION_MINUTES = 120;

export function createInitialStudioForm(): StudioForm {
  return {
    title: "",
    genre: "本格推理",
    playerCount: DEFAULT_PLAYER_COUNT,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    difficulty: "standard",
    supernaturalAllowed: false,
    premise: "",
    tone: "悬疑",
    themeStatement: "",
  };
}

export function buildGenerateRequest(form: StudioForm): StudioGenerateStoryBibleRequest {
  return {
    title: form.title,
    genre: form.genre,
    playerCount: form.playerCount,
    durationMinutes: form.durationMinutes,
    difficulty: form.difficulty,
    supernaturalAllowed: form.supernaturalAllowed,
    premise: form.premise,
    tone: form.tone,
    themeStatement: form.themeStatement,
  };
}

export function formatAttemptSummary(result: StudioGenerateStoryBibleResult): string {
  const latestAttempt = result.attempts.at(-1);
  const overview = formatDiagnosticOverview(result.criticDiagnostics, result.storyBibleDiagnostics);

  if (!latestAttempt) {
    return `未执行生成尝试\n${overview}`;
  }

  return [`最新尝试：${formatAttemptStatus(latestAttempt)}`, overview, ...result.attempts.map(formatAttemptBlock)].join("\n");
}

export function formatCompileDraftOutput(result: CompileStoryBibleDraftResult): string {
  const draftSummary = formatDraftPackageSummary(result.draftPackage);
  const flowSummary = formatDiagnosticsCount("Flow diagnostics", result.flowDiagnostics);
  const simulationSummary = formatDiagnosticsCount("Simulation diagnostics", result.simulationDiagnostics);

  return [draftSummary, flowSummary, simulationSummary, "", "原始响应 JSON", JSON.stringify(result, null, 2)].join("\n");
}

export function formatRelationEdges(storyBible: StoryBible): readonly string[] {
  const nameById = new Map(storyBible.characters.map((character) => [character.id, character.name]));

  return storyBible.characters.flatMap((character) => {
    return character.relations.map((relation) => {
      return `${character.name} -> ${readCharacterName(nameById, relation.target_character_id)}：${relation.summary}`;
    });
  });
}

export function formatRelationGraph(storyBible: StoryBible): string {
  const nameById = new Map(storyBible.characters.map((character) => [character.id, character.name]));
  const edges = storyBible.characters.flatMap((character) => {
    return character.relations.map((relation) => {
      const targetName = readCharacterName(nameById, relation.target_character_id);
      return `${character.name} --${relation.summary}--> ${targetName}`;
    });
  });

  return edges.length === 0 ? "无角色关系。" : edges.join("\n");
}

export function formatDiffSummary(previous: StoryBible, next: StoryBible): readonly string[] {
  return DIFF_FIELDS.flatMap((field) => {
    const previousValue = readDiffField(previous, field);
    const nextValue = readDiffField(next, field);

    if (previousValue === nextValue) {
      return [];
    }

    return [`${field}: ${previousValue} -> ${nextValue}`];
  });
}

export function formatRetryDiffSummary(previous: StoryBible, next: StoryBible): string {
  const diff = formatDiffSummary(previous, next).join("\n") || "无字段差异。";

  return `重试差异\n${diff}`;
}

export function createStorySkeletonEditorState(storyBible: StoryBible): StorySkeletonEditorState {
  const skeleton = readStorySkeleton(storyBible);

  return {
    draftText: JSON.stringify(skeleton, null, 2),
    status: formatSkeletonStatus(storyBible),
  };
}

const DIFF_FIELDS = [
  "meta.title",
  "meta.genre",
  "meta.player_count",
  "meta.duration_minutes",
  "meta.difficulty",
  "meta.supernatural_allowed",
  "theme.premise",
  "theme.theme_statement",
  "theme.tone",
  "truth.core_case",
  "truth.killer_or_core_secret",
] as const;

type DiffField = (typeof DIFF_FIELDS)[number];

function readCharacterName(nameById: ReadonlyMap<string, string>, characterId: string): string {
  const characterName = nameById.get(characterId);

  if (!characterName) {
    throw new Error(`Unknown relation target character: ${characterId}`);
  }

  return characterName;
}

function readStorySkeleton(storyBible: StoryBible): StoryBible {
  return {
    meta: storyBible.meta,
    theme: storyBible.theme,
    truth: storyBible.truth,
    characters: storyBible.characters,
    clues: storyBible.clues,
    acts: storyBible.acts,
    endings: storyBible.endings,
  };
}

function formatSkeletonStatus(storyBible: StoryBible): string {
  return `骨架可编辑：${storyBible.characters.length} 个角色 / ${storyBible.clues.length} 条线索 / ${storyBible.acts.length} 幕`;
}

function formatAttemptStatus(attempt: StudioGenerationAttempt): string {
  return `第 ${attempt.attempt} 次 · ${attempt.accepted ? "通过" : "未通过"}`;
}

function formatAttemptBlock(attempt: StudioGenerationAttempt): string {
  return [
    formatAttemptStatus(attempt),
    formatDiagnosticList("Critic diagnostics", attempt.criticDiagnostics),
    formatDiagnosticList("StoryBible diagnostics", attempt.storyBibleDiagnostics),
  ].join("\n");
}

function formatDiagnosticOverview(
  criticDiagnostics: readonly StudioDiagnostic[],
  storyBibleDiagnostics: readonly StudioDiagnostic[],
): string {
  return `总览：critic ${criticDiagnostics.length} 条 / story bible ${storyBibleDiagnostics.length} 条`;
}

function formatDiagnosticList(label: string, diagnostics: readonly StudioDiagnostic[]): string {
  const summary = `${label}：${diagnostics.length} 条`;
  const details = diagnostics.map(formatDiagnosticLine);

  return [summary, ...details].join("\n");
}

function formatDiagnosticLine(diagnostic: StudioDiagnostic): string {
  const path = diagnostic.path ? ` @ ${diagnostic.path}` : "";

  return `[${diagnostic.severity}] ${diagnostic.code}${path}：${diagnostic.message}`;
}

function formatDraftPackageSummary(draftPackage: unknown): string {
  if (!isObjectRecord(draftPackage)) {
    return "草稿 package 信息缺失";
  }

  const id = readOptionalString(draftPackage.id, "unknown-package");
  const title = readOptionalString(draftPackage.title, "未命名草稿");
  const packageCode = readOptionalString(draftPackage.packageCode, "unknown-code");

  return `草稿 ${id} · ${title} · ${packageCode}`;
}

function formatDiagnosticsCount(label: string, diagnostics: readonly unknown[]): string {
  return `${label}：${diagnostics.length} 条`;
}

function readOptionalString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readDiffField(storyBible: StoryBible, field: DiffField): string {
  const value = field.split(".").reduce<unknown>((current, key) => {
    return typeof current === "object" && current !== null ? current[key as keyof typeof current] : undefined;
  }, storyBible);

  return String(value);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

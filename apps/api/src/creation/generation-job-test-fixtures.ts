import { parseStoryBible, type ScriptPackage, type StoryBible } from "@jubensha/dsl";
import type { ScriptPackageRecord } from "../content/content-repository.js";
import type { CreationOrchestrator, GenerateStoryBibleResult } from "./creation-orchestrator.js";
import { GenerationJobService, InMemoryGenerationJobRepository } from "./generation-job.js";
import { ScriptCreationPipeline, type ScriptCreationPipelineDiagnostic, type ScriptCreationQualityReviewer } from "./script-creation-pipeline.js";
import type { ScriptRepairAgent } from "./script-repair-agent.js";

export const brief = {
  premise: "雾港旧账牵出失踪案",
  playerCount: 1,
  title: "雾港新案",
  genre: "mystery",
};

export const storyBible = buildStoryBible();

export const criticDiagnostic = {
  severity: "error" as const,
  code: "timeline_conflict",
  path: "truth.timeline",
  message: "时间线冲突。",
};

export const deterministicDiagnostic: ScriptCreationPipelineDiagnostic = {
  severity: "error",
  code: "missing_clue",
  path: "scenes.act1",
  message: "Missing clue reference: missing",
  stage: "deterministic_review",
};

export interface CreateServiceOptions {
  readonly fail?: boolean;
  readonly storyResult?: GenerateStoryBibleResult;
  readonly draftWriter?: CapturingDraftWriter;
  readonly qualityReviewer?: ScriptCreationQualityReviewer;
  readonly repairAgent?: ScriptRepairAgent;
}

export function createService(options: CreateServiceOptions = {}) {
  const orchestrator = createOrchestrator(options);
  const pipeline = new ScriptCreationPipeline({
    orchestrator,
    ...optionalField("qualityReviewer", options.qualityReviewer),
    ...optionalField("repairAgent", options.repairAgent),
    runIdGenerator: () => "unused_run_id",
  });

  return new GenerationJobService({
    repository: new InMemoryGenerationJobRepository(),
    pipeline,
    draftWriter: options.draftWriter ?? new CapturingDraftWriter(),
    idGenerator: () => "generation_job_1",
    now: () => "2026-04-25T08:00:00.000Z",
  });
}

export function createStoryResult(
  criticDiagnostics: GenerateStoryBibleResult["criticDiagnostics"],
  nextStoryBible: StoryBible = storyBible,
): GenerateStoryBibleResult {
  const accepted = criticDiagnostics.every((diagnostic) => diagnostic.severity !== "error");

  return {
    storyBible: nextStoryBible,
    criticDiagnostics,
    attempts: [
      {
        attempt: 1,
        accepted,
        storyBible: nextStoryBible,
        criticDiagnostics,
        storyBibleDiagnostics: [],
      },
    ],
  };
}

export class CapturingDraftWriter {
  readonly savedPackages: ScriptPackage[] = [];
  readonly releasedVersions: unknown[] = [];

  async createDraftPackage(scriptPackage: ScriptPackage): Promise<ScriptPackageRecord> {
    this.savedPackages.push(scriptPackage);
    return { id: "package_1", currentDraft: { content: scriptPackage }, releasedVersions: this.releasedVersions as never };
  }
}

export class FixedReviewer implements ScriptCreationQualityReviewer {
  constructor(
    private readonly readyForPublish: boolean,
    private readonly diagnostics: readonly ScriptCreationPipelineDiagnostic[],
  ) {}

  reviewPackage() {
    const errors = this.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;

    return {
      readyForPublish: this.readyForPublish,
      diagnostics: this.diagnostics,
      summary: { errors, warnings: 0, info: 0 },
      report: { headline: "fixed", readinessLabel: "blocked" as const, sections: [] },
    };
  }
}

export function buildStoryBible(includeClue = true): StoryBible {
  return parseStoryBible({
    meta: createMeta(),
    theme: createTheme(),
    truth: createTruth(),
    characters: [createCharacter()],
    clues: includeClue ? [createClue()] : [],
    acts: [{ id: "act1", title: "登船", goal: "调查账本。", scene_seeds: ["码头"] }],
    endings: [{ id: "truth", title: "真相", condition: "指出账本。", summary: "真相公开。" }],
  });
}

function createOrchestrator(options: CreateServiceOptions): CreationOrchestrator {
  return {
    async generateStoryBible() {
      if (options.fail) {
        throw new Error("provider offline");
      }

      return options.storyResult ?? createStoryResult([]);
    },
  } as unknown as CreationOrchestrator;
}

function createMeta() {
  return {
    title: "雾港新案",
    genre: "mystery",
    player_count: 1,
    duration_minutes: 180,
    difficulty: "medium",
    supernatural_allowed: false,
  };
}

function createTheme() {
  return {
    premise: "雾港旧账牵出失踪案。",
    theme_statement: "旧债终会浮出水面。",
    tone: "阴冷",
  };
}

function createTruth() {
  return {
    core_case: "船主失踪。",
    killer_or_core_secret: "管家调换账本。",
    timeline: [{ id: "truth_1", title: "调换", summary: "账本被调换。", actor_ids: ["butler"] }],
  };
}

function createCharacter() {
  return {
    id: "butler",
    name: "管家",
    public_profile: "沉默的管家。",
    private_secret: "调换账本。",
    goal: "隐藏旧案。",
    fear: "骗局曝光。",
    arc: "从否认到承认。",
    relations: [],
  };
}

function createClue() {
  return {
    id: "ledger",
    title: "账本",
    content: "账本潮湿。",
    source_character_ids: ["butler"],
    red_herring: false,
  };
}

function optionalField<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}

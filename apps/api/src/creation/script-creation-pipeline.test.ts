import { readFile } from "node:fs/promises";
import { parseStoryBible, type StoryBible } from "@jubensha/dsl";
import { describe, expect, it } from "vitest";
import {
  ScriptCreationPipeline,
  type ScriptCreationPipelineDiagnostic,
  type ScriptCreationQualityReviewer,
} from "./script-creation-pipeline.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";
import type { CriticDiagnostic } from "./story-critic-agent.js";
import type { GenerateStoryBibleResult } from "./creation-orchestrator.js";

const brief: StoryPlannerInput = {
  premise: "雾港旧账牵出失踪案",
  playerCount: 2,
  title: "雾港失踪案",
  genre: "mystery",
  difficulty: "medium",
  durationMinutes: 180,
};

describe("ScriptCreationPipeline", () => {
  it("runs valid brief through story, critic, draft, deterministic review", async () => {
    const storyBible = buildStoryBible();
    const pipeline = createPipeline({ storyBible, runId: "run_1" });

    const result = await pipeline.run({ brief, runId: "run_1" });

    expect(result).toMatchObject({
      runId: "run_1",
      inputSummary: { title: "雾港失踪案", playerCount: 2, genre: "mystery" },
      stage: "ready_for_review",
      status: "ready_for_review",
      readyForPublish: true,
      errors: [],
    });
    expect(result.storyBible).toEqual(storyBible);
    expect(result.criticDiagnostics).toEqual([]);
    expect(result.scriptPackageDraft?.status).toBe("draft");
    expect(result.draftResult?.scriptPackageDraft.title).toBe("雾港失踪案");
    expect(result.qualityReport?.readyForPublish).toBe(true);
  });

  it("returns blocked with explicit critic diagnostics", async () => {
    const criticDiagnostic = blockingCriticDiagnostic();
    const pipeline = createPipeline({
      storyBible: buildStoryBible(),
      criticDiagnostics: [criticDiagnostic],
    });

    const result = await pipeline.run({ brief });

    expect(result.status).toBe("blocked");
    expect(result.stage).toBe("blocked");
    expect(result.readyForPublish).toBe(false);
    expect(result.criticDiagnostics).toEqual([criticDiagnostic]);
    expect(result.scriptPackageDraft).toBeUndefined();
    expect(result.errors).toEqual([
      {
        severity: "error",
        code: "critic.timeline_conflict",
        path: "truth.timeline",
        message: "时间线冲突。",
        stage: "criticizing_story",
      },
    ]);
  });

  it("returns structured compiler error without runtime writes", async () => {
    const pipeline = createPipeline({ storyBible: buildStoryBible({ includeClue: false }) });

    const result = await pipeline.run({ brief });

    expect(result.status).toBe("failed");
    expect(result.stage).toBe("failed");
    expect(result.readyForPublish).toBe(false);
    expect(result.errors[0]).toMatchObject({
      severity: "error",
      code: "compiler_error",
      path: "scriptPackageDraft",
      stage: "compiling_draft",
    });
    expect(result.scriptPackageDraft).toBeUndefined();
  });

  it("keeps deterministic quality failures visible", async () => {
    const qualityDiagnostic: ScriptCreationPipelineDiagnostic = {
      severity: "error",
      code: "missing_clue",
      path: "scenes.act1",
      message: "Missing clue reference: missing",
      stage: "deterministic_review",
    };
    const pipeline = createPipeline({
      storyBible: buildStoryBible(),
      reviewer: new FixedReviewer(false, [qualityDiagnostic]),
    });

    const result = await pipeline.run({ brief });

    expect(result.status).toBe("blocked");
    expect(result.stage).toBe("blocked");
    expect(result.readyForPublish).toBe(false);
    expect(result.errors).toEqual([qualityDiagnostic]);
    expect(result.qualityReport?.diagnostics).toEqual([qualityDiagnostic]);
  });

  it("does not import runtime services", async () => {
    const source = await readFile(new URL("./script-creation-pipeline.ts", import.meta.url), "utf8");

    expect(source).not.toContain("../runtime");
    expect(source).not.toContain("RuntimeService");
  });
});

interface CreatePipelineOptions {
  readonly storyBible: StoryBible;
  readonly criticDiagnostics?: readonly CriticDiagnostic[];
  readonly reviewer?: ScriptCreationQualityReviewer;
  readonly runId?: string;
}

function createPipeline(options: CreatePipelineOptions): ScriptCreationPipeline {
  return new ScriptCreationPipeline({
    orchestrator: {
      generateStoryBible: async () => createStoryBibleResult(options.storyBible, options.criticDiagnostics ?? []),
    } as never,
    qualityReviewer: options.reviewer,
    runIdGenerator: () => options.runId ?? "run_test",
  });
}

function createStoryBibleResult(
  storyBible: StoryBible,
  criticDiagnostics: readonly CriticDiagnostic[],
): GenerateStoryBibleResult {
  const accepted = criticDiagnostics.every((diagnostic) => diagnostic.severity !== "error");

  return {
    storyBible,
    criticDiagnostics,
    attempts: [{ attempt: 1, accepted, storyBible, criticDiagnostics, storyBibleDiagnostics: [] }],
  };
}

class FixedReviewer implements ScriptCreationQualityReviewer {
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

function blockingCriticDiagnostic(): CriticDiagnostic {
  return {
    severity: "error",
    code: "timeline_conflict",
    path: "truth.timeline",
    message: "时间线冲突。",
  };
}

interface BuildStoryBibleOptions {
  readonly includeClue?: boolean;
}

function buildStoryBible(options: BuildStoryBibleOptions = {}): StoryBible {
  return parseStoryBible({
    meta: {
      title: "雾港失踪案",
      genre: "mystery",
      player_count: 2,
      duration_minutes: 180,
      difficulty: "medium",
      supernatural_allowed: false,
    },
    theme: {
      premise: "雾港旧账牵出失踪案。",
      theme_statement: "旧债终会浮出水面。",
      tone: "阴冷",
    },
    truth: {
      core_case: "船主失踪。",
      killer_or_core_secret: "管家调换账本。",
      timeline: [{ id: "truth_1", title: "调换", summary: "账本被调换。", actor_ids: ["butler"] }],
    },
    characters: [
      {
        id: "butler",
        name: "管家",
        public_profile: "沉默的管家。",
        private_secret: "调换账本。",
        goal: "隐藏旧案。",
        fear: "骗局曝光。",
        arc: "从否认到承认。",
        relations: [],
      },
    ],
    clues: options.includeClue === false ? [] : [createClue()],
    acts: [{ id: "act1", title: "登船", goal: "调查账本。", scene_seeds: ["码头"] }],
    endings: [{ id: "truth", title: "真相", condition: "指出账本。", summary: "真相公开。" }],
  });
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

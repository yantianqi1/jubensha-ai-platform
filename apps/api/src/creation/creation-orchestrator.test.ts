import { parseStoryBible, type StoryBible } from "@jubensha/dsl";
import { describe, expect, it } from "vitest";
import { CreationOrchestrator } from "./creation-orchestrator.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";
import type { CriticDiagnostic } from "./story-critic-agent.js";

const input: StoryPlannerInput = {
  premise: "雾港旧账引发失踪案",
  playerCount: 4,
  durationMinutes: 180,
  difficulty: "medium",
  genre: "mystery",
  tone: "阴冷",
};

describe("CreationOrchestrator", () => {
  it("returns accepted planner and critic result", async () => {
    const storyBible = buildStoryBible("雾港新案");
    const orchestrator = createOrchestrator({ storyBibles: [storyBible], diagnostics: [[]] });

    const result = await orchestrator.generateStoryBible(input);

    expect(result.storyBible.meta.title).toBe("雾港新案");
    expect(result.criticDiagnostics).toEqual([]);
    expect(result.attempts).toEqual([
      expect.objectContaining({ attempt: 1, accepted: true, storyBible }),
    ]);
  });

  it("retries when critic returns blocking diagnostics", async () => {
    const first = buildStoryBible("坏版本");
    const second = buildStoryBible("好版本");
    const orchestrator = createOrchestrator({
      storyBibles: [first, second],
      diagnostics: [[blockingDiagnostic()], []],
      maxAttempts: 2,
    });

    const result = await orchestrator.generateStoryBible(input);

    expect(result.storyBible.meta.title).toBe("好版本");
    expect(result.attempts.map((attempt) => attempt.accepted)).toEqual([false, true]);
  });

  it("feeds previous story bible and diagnostics into retry planner input", async () => {
    const first = buildStoryBible("引用错误版本", { actorIds: ["missing-character"] });
    const second = buildStoryBible("修复版本");
    const criticDiagnostic = blockingDiagnostic();
    const plannerInputs: StoryPlannerInput[] = [];

    const orchestrator = createOrchestrator({
      storyBibles: [first, second],
      diagnostics: [[criticDiagnostic], []],
      maxAttempts: 2,
      onPlannerInput: (plannerInput) => plannerInputs.push(plannerInput),
    });

    await orchestrator.generateStoryBible(input);

    expect(plannerInputs[0]).toEqual(input);
    expect(plannerInputs[1]).toEqual({
      ...input,
      previousStoryBible: first,
      previousReferenceDiagnostics: expect.arrayContaining([
        expect.objectContaining({ path: expect.stringContaining("truth.timeline") }),
      ]),
      previousCriticDiagnostics: [criticDiagnostic],
    });
  });
});

interface CreateOrchestratorOptions {
  readonly storyBibles: readonly StoryBible[];
  readonly diagnostics: readonly (readonly CriticDiagnostic[])[];
  readonly maxAttempts?: number;
  readonly onPlannerInput?: (input: StoryPlannerInput) => void;
}

function createOrchestrator(options: CreateOrchestratorOptions): CreationOrchestrator {
  let calls = 0;

  return new CreationOrchestrator({
    maxAttempts: options.maxAttempts,
    planner: {
      async planStoryBible(plannerInput: StoryPlannerInput) {
        options.onPlannerInput?.(plannerInput);
        const storyBible = options.storyBibles[calls];
        calls += 1;
        return storyBible ?? options.storyBibles.at(-1)!;
      },
    } as never,
    critic: {
      async reviewStoryBible() {
        return options.diagnostics[calls - 1] ?? [];
      },
    } as never,
  });
}

function blockingDiagnostic(): CriticDiagnostic {
  return {
    severity: "error",
    code: "timeline_conflict",
    path: "truth.timeline",
    message: "时间线冲突。",
  };
}

interface BuildStoryBibleOptions {
  readonly actorIds?: readonly string[];
}

function buildStoryBible(title: string, options: BuildStoryBibleOptions = {}): StoryBible {
  const actorIds = options.actorIds ?? ["captain"];

  return parseStoryBible({
    meta: {
      title,
      genre: "mystery",
      player_count: 4,
      duration_minutes: 180,
      difficulty: "medium",
      supernatural_allowed: false,
    },
    theme: {
      premise: "雾港旧账引发失踪案。",
      theme_statement: "旧债终会浮出水面。",
      tone: "阴冷",
    },
    truth: {
      core_case: "船主失踪。",
      killer_or_core_secret: "老船长调换账本。",
      timeline: [{ id: "truth_1", title: "调换", summary: "账本被调换。", actor_ids: actorIds }],
    },
    characters: [
      {
        id: "captain",
        name: "老船长",
        public_profile: "退休船长。",
        private_secret: "调换账本。",
        goal: "隐藏旧案。",
        fear: "骗局曝光。",
        arc: "从否认到承认。",
        relations: [],
      },
    ],
    clues: [
      {
        id: "ledger",
        title: "账本",
        content: "账本潮湿。",
        source_character_ids: ["captain"],
        red_herring: false,
      },
    ],
    acts: [{ id: "act1", title: "登船", goal: "调查账本。", scene_seeds: ["码头"] }],
    endings: [{ id: "truth", title: "真相", condition: "指出账本。", summary: "真相公开。" }],
  });
}

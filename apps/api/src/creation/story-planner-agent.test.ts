import { describe, expect, it } from "vitest";
import { CreationModelValidationError } from "./creation-errors.js";
import { StoryPlannerAgent } from "./story-planner-agent.js";
import type { CreationModelProvider, ModelJsonInput } from "./creation-model-provider.js";

const validStoryBiblePayload = {
  meta: {
    title: "雾港失踪案",
    genre: "mystery",
    player_count: 1,
    duration_minutes: 180,
    difficulty: "入门",
    supernatural_allowed: false,
  },
  theme: {
    premise: "港口宅邸内的一场离奇失踪。",
    theme_statement: "旧案会吞没人心。",
    tone: "冷峻悬疑",
  },
  truth: {
    core_case: "宅邸主人离奇失踪。",
    killer_or_core_secret: "管家伪造现场。",
    timeline: [{ id: "truth_1", title: "伪造", summary: "伪造现场。", actor_ids: ["butler"] }],
  },
  characters: [
    {
      id: "butler",
      name: "管家",
      public_profile: "沉默的宅邸管家。",
      private_secret: "知道真相。",
      goal: "保护秘密。",
      fear: "秘密曝光。",
      arc: "从沉默到崩溃。",
    },
  ],
  clues: [
    {
      id: "scratch",
      title: "划痕",
      content: "窗台划痕。",
      source_character_ids: ["butler"],
      red_herring: false,
    },
  ],
  acts: [{ id: "act1", title: "初入宅邸", goal: "建立疑点。", scene_seeds: ["抵达宅邸。"] }],
  endings: [{ id: "truth", title: "真相", condition: "公开线索。", summary: "真相揭开。" }],
};

function providerReturning(output: string): CreationModelProvider {
  return { completeJson: async () => output };
}

describe("StoryPlannerAgent", () => {
  it("requests JSON mode and returns a parsed story bible", async () => {
    let capturedInput: ModelJsonInput | undefined;
    const provider: CreationModelProvider = {
      completeJson: async (input) => {
        capturedInput = input;
        return JSON.stringify(validStoryBiblePayload);
      },
    };
    const agent = new StoryPlannerAgent({ provider });

    const storyBible = await agent.planStoryBible({ premise: "港口失踪", playerCount: 1 });

    expect(storyBible.meta.title).toBe("雾港失踪案");
    expect(capturedInput?.jsonMode).toBe(true);
    expect(capturedInput?.systemPrompt).toContain("StoryBible");
    expect(capturedInput?.userPrompt).toContain("港口失踪");
  });

  it("includes previous story bible and diagnostics in retry prompt", async () => {
    let capturedInput: ModelJsonInput | undefined;
    const provider: CreationModelProvider = {
      completeJson: async (input) => {
        capturedInput = input;
        return JSON.stringify(validStoryBiblePayload);
      },
    };
    const agent = new StoryPlannerAgent({ provider });

    await agent.planStoryBible({
      premise: "港口失踪",
      playerCount: 1,
      previousStoryBible: validStoryBiblePayload,
      previousReferenceDiagnostics: [{ path: "truth.timeline[0].actor_ids", message: "missing actor" }],
      previousCriticDiagnostics: [
        { severity: "error", code: "thin_motive", path: "characters[0].goal", message: "动机薄弱" },
      ],
    });

    const prompt = JSON.parse(capturedInput?.userPrompt ?? "{}");
    expect(prompt.previousStoryBible.meta.title).toBe("雾港失踪案");
    expect(prompt.previousReferenceDiagnostics).toEqual([
      { path: "truth.timeline[0].actor_ids", message: "missing actor" },
    ]);
    expect(prompt.previousCriticDiagnostics).toEqual([
      { severity: "error", code: "thin_motive", path: "characters[0].goal", message: "动机薄弱" },
    ]);
  });

  it("throws CreationModelValidationError for invalid JSON", async () => {
    const agent = new StoryPlannerAgent({ provider: providerReturning("not json") });

    await expect(agent.planStoryBible({ premise: "港口失踪", playerCount: 1 })).rejects.toBeInstanceOf(
      CreationModelValidationError,
    );
  });

  it("throws CreationModelValidationError for invalid story bible schema", async () => {
    const agent = new StoryPlannerAgent({ provider: providerReturning(JSON.stringify({ meta: {} })) });

    await expect(agent.planStoryBible({ premise: "港口失踪", playerCount: 1 })).rejects.toBeInstanceOf(
      CreationModelValidationError,
    );
  });
});

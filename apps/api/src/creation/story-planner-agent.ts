import { parseStoryBible, type StoryBible } from "@jubensha/dsl";
import { CreationModelValidationError } from "./creation-errors.js";
import type { CreationModelProvider } from "./creation-model-provider.js";
import type { CriticDiagnostic } from "./story-critic-agent.js";

export interface StoryPlannerAgentOptions {
  readonly provider: CreationModelProvider;
}

export interface StoryPlannerInput {
  readonly title?: string;
  readonly premise: string;
  readonly playerCount: number;
  readonly genre?: string;
  readonly tone?: string;
  readonly difficulty?: string;
  readonly supernaturalAllowed?: boolean;
  readonly themeStatement?: string;
  readonly durationMinutes?: number;
  readonly previousStoryBible?: StoryBible;
  readonly previousReferenceDiagnostics?: readonly unknown[];
  readonly previousCriticDiagnostics?: readonly CriticDiagnostic[];
}

export class StoryPlannerAgent {
  private readonly provider: CreationModelProvider;

  constructor(options: StoryPlannerAgentOptions) {
    this.provider = options.provider;
  }

  async planStoryBible(input: StoryPlannerInput): Promise<StoryBible> {
    const output = await this.provider.completeJson({
      systemPrompt: buildPlannerSystemPrompt(),
      userPrompt: buildPlannerUserPrompt(input),
      jsonMode: true,
    });

    return parseModelStoryBible(output);
  }
}

function parseModelStoryBible(output: string): StoryBible {
  try {
    return parseStoryBible(JSON.parse(output));
  } catch (error) {
    throw new CreationModelValidationError("Planner model output is not a valid StoryBible", error);
  }
}

function buildPlannerSystemPrompt(): string {
  return [
    "You are a mystery game StoryBible planner.",
    "Return only JSON matching the StoryBible schema.",
    "Do not include markdown fences or explanatory text.",
  ].join("\n");
}

function buildPlannerUserPrompt(input: StoryPlannerInput): string {
  return JSON.stringify({
    task: "plan_story_bible",
    title: input.title,
    premise: input.premise,
    playerCount: input.playerCount,
    genre: input.genre,
    tone: input.tone,
    difficulty: input.difficulty,
    supernaturalAllowed: input.supernaturalAllowed,
    themeStatement: input.themeStatement,
    durationMinutes: input.durationMinutes,
    previousStoryBible: input.previousStoryBible,
    previousReferenceDiagnostics: input.previousReferenceDiagnostics,
    previousCriticDiagnostics: input.previousCriticDiagnostics,
  });
}

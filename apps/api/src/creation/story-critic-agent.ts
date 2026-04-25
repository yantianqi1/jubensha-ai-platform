import { type StoryBible } from "@jubensha/dsl";
import { z } from "zod";
import { CreationModelValidationError } from "./creation-errors.js";
import type { CreationModelProvider } from "./creation-model-provider.js";

export const CriticDiagnosticSchema = z.object({
  severity: z.enum(["error", "warning"]),
  code: z.string().min(1),
  path: z.string().min(1),
  message: z.string().min(1),
});

const CriticReviewSchema = z.object({
  diagnostics: z.array(CriticDiagnosticSchema),
});

export type CriticDiagnostic = z.infer<typeof CriticDiagnosticSchema>;

export interface StoryCriticAgentOptions {
  readonly provider: CreationModelProvider;
}

export class StoryCriticAgent {
  private readonly provider: CreationModelProvider;

  constructor(options: StoryCriticAgentOptions) {
    this.provider = options.provider;
  }

  async reviewStoryBible(storyBible: StoryBible): Promise<readonly CriticDiagnostic[]> {
    const output = await this.provider.completeJson({
      systemPrompt: buildCriticSystemPrompt(),
      userPrompt: buildCriticUserPrompt(storyBible),
      jsonMode: true,
    });

    return parseCriticDiagnostics(output);
  }
}

function parseCriticDiagnostics(output: string): readonly CriticDiagnostic[] {
  try {
    return CriticReviewSchema.parse(JSON.parse(output)).diagnostics;
  } catch (error) {
    throw new CreationModelValidationError("Critic model output is not valid diagnostics JSON", error);
  }
}

function buildCriticSystemPrompt(): string {
  return [
    "You are a critic for mystery game StoryBible quality.",
    "Return only JSON with a diagnostics array.",
    "Each diagnostic must include severity, code, path, and message.",
  ].join("\n");
}

function buildCriticUserPrompt(storyBible: StoryBible): string {
  return JSON.stringify({
    task: "review_story_bible",
    storyBible,
  });
}

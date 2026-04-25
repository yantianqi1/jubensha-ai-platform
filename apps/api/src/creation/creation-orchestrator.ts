import { validateStoryBibleReferences, type StoryBible } from "@jubensha/dsl";
import type { StoryPlannerAgent, StoryPlannerInput } from "./story-planner-agent.js";
import type { CriticDiagnostic, StoryCriticAgent } from "./story-critic-agent.js";

const DEFAULT_MAX_ATTEMPTS = 2;

export interface CreationOrchestratorOptions {
  readonly planner: StoryPlannerAgent;
  readonly critic: StoryCriticAgent;
  readonly maxAttempts?: number;
}

export interface CreationAttemptResult {
  readonly attempt: number;
  readonly accepted: boolean;
  readonly storyBible: StoryBible;
  readonly criticDiagnostics: readonly CriticDiagnostic[];
  readonly storyBibleDiagnostics: readonly unknown[];
}

export interface GenerateStoryBibleResult {
  readonly storyBible: StoryBible;
  readonly criticDiagnostics: readonly CriticDiagnostic[];
  readonly attempts: readonly CreationAttemptResult[];
}

export class CreationOrchestrator {
  private readonly planner: StoryPlannerAgent;
  private readonly critic: StoryCriticAgent;
  private readonly maxAttempts: number;

  constructor(options: CreationOrchestratorOptions) {
    this.planner = options.planner;
    this.critic = options.critic;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  }

  async generateStoryBible(input: StoryPlannerInput): Promise<GenerateStoryBibleResult> {
    const attempts = await this.runAttempts(input);
    const accepted = attempts.find((attempt) => attempt.accepted);
    const finalAttempt = accepted ?? readLastAttempt(attempts);

    return {
      storyBible: finalAttempt.storyBible,
      criticDiagnostics: finalAttempt.criticDiagnostics,
      attempts,
    };
  }

  private async runAttempts(input: StoryPlannerInput): Promise<readonly CreationAttemptResult[]> {
    const attempts: CreationAttemptResult[] = [];
    let plannerInput = input;

    for (let attemptNumber = 1; attemptNumber <= this.maxAttempts; attemptNumber += 1) {
      const attempt = await this.runAttempt(plannerInput, attemptNumber);
      attempts.push(attempt);

      if (attempt.accepted) {
        return attempts;
      }

      plannerInput = buildRetryPlannerInput(input, attempt);
    }

    return attempts;
  }

  private async runAttempt(
    input: StoryPlannerInput,
    attempt: number,
  ): Promise<CreationAttemptResult> {
    const storyBible = await this.planner.planStoryBible(input);
    const storyBibleDiagnostics = validateStoryBibleReferences(storyBible);
    const criticDiagnostics = await this.critic.reviewStoryBible(storyBible);
    const accepted = storyBibleDiagnostics.length === 0 && !hasBlockingDiagnostics(criticDiagnostics);

    return { attempt, accepted, storyBible, criticDiagnostics, storyBibleDiagnostics };
  }
}

function hasBlockingDiagnostics(diagnostics: readonly CriticDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function readLastAttempt(attempts: readonly CreationAttemptResult[]): CreationAttemptResult {
  const attempt = attempts.at(-1);

  if (!attempt) {
    throw new Error("Creation orchestration produced no attempts");
  }

  return attempt;
}

function buildRetryPlannerInput(
  originalInput: StoryPlannerInput,
  previousAttempt: CreationAttemptResult,
): StoryPlannerInput {
  return {
    ...originalInput,
    previousStoryBible: previousAttempt.storyBible,
    previousReferenceDiagnostics: previousAttempt.storyBibleDiagnostics,
    previousCriticDiagnostics: previousAttempt.criticDiagnostics,
  };
}

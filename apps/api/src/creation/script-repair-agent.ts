import type { ScriptPackage, StoryBible } from "@jubensha/dsl";
import type { ScriptCreationInputSummary, ScriptCreationPipelineDiagnostic } from "./script-creation-pipeline.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";
import type { CriticDiagnostic } from "./story-critic-agent.js";

export type ScriptRepairStage = "compiler" | "quality_gate" | "story_bible";
export type ScriptRepairStatus = "applied" | "skipped" | "failed";
export type ScriptRepairDiagnostic = ScriptCreationPipelineDiagnostic;

export interface ScriptRepairInput {
  readonly brief: StoryPlannerInput;
  readonly currentStoryBible: StoryBible;
  readonly criticDiagnostics: readonly CriticDiagnostic[];
  readonly qualityDiagnostics: readonly ScriptCreationPipelineDiagnostic[];
  readonly compilerError?: ScriptCreationPipelineDiagnostic;
  readonly previousAttempts: readonly ScriptRepairAttempt[];
}

export interface ScriptRepairResult {
  readonly repairedStoryBible: StoryBible;
  readonly diagnostics: readonly ScriptRepairDiagnostic[];
}

export interface ScriptRepairAgent {
  repairStoryBible(input: ScriptRepairInput): Promise<ScriptRepairResult>;
}

export interface ScriptRepairAttempt {
  readonly attemptNumber: number;
  readonly stage: ScriptRepairStage;
  readonly sourceIssueCodes: readonly string[];
  readonly inputSummary: ScriptCreationInputSummary;
  readonly repairedStoryBible?: StoryBible;
  readonly repairedPackageDraft?: ScriptPackage;
  readonly diagnostics: readonly ScriptRepairDiagnostic[];
  readonly status: ScriptRepairStatus;
  readonly reason?: string;
}

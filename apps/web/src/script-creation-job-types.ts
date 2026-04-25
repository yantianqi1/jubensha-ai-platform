export type ScriptCreationJobStage =
  | "queued"
  | "received_brief"
  | "planning_story"
  | "criticizing_story"
  | "compiling_draft"
  | "deterministic_review"
  | "ready_for_review"
  | "blocked"
  | "failed";

export type ScriptCreationSeverity = "info" | "warning" | "error";

export interface ScriptCreationDiagnosticView {
  readonly code: string;
  readonly message: string;
  readonly severity: ScriptCreationSeverity;
}

export interface ScriptCreationActivityView {
  readonly time: string;
  readonly title: string;
  readonly detail: string;
  readonly severity: ScriptCreationSeverity;
}

export interface ScriptCreationJobView {
  readonly id: string;
  readonly stage: ScriptCreationJobStage;
  readonly title: string;
  readonly brief: string;
  readonly progress: number;
  readonly readyForPublish: boolean;
  readonly storyBible?: {
    readonly premise: string;
    readonly theme: string;
    readonly characters: readonly string[];
  };
  readonly criticReview?: {
    readonly verdict: string;
    readonly diagnostics: readonly ScriptCreationDiagnosticView[];
  };
  readonly draftPackage?: {
    readonly packageId: string;
    readonly acts: number;
    readonly scenes: number;
    readonly clues: number;
  };
  readonly qualityReport?: {
    readonly score: number;
    readonly diagnostics: readonly ScriptCreationDiagnosticView[];
  };
  readonly activity: readonly ScriptCreationActivityView[];
  readonly errors: readonly ScriptCreationDiagnosticView[];
}

export interface ApiClientOptions {
  readonly fetch?: typeof fetch;
  readonly operatorId?: string;
  readonly playerId?: string;
}

export interface ApiErrorResponseBody {
  readonly error: string;
  readonly message: string;
  readonly [key: string]: unknown;
}

export interface PlayableDemoResult {
  readonly packageId: string;
  readonly versionId: string;
  readonly room: ApiRuntimeRoom;
}

export interface ApiRuntimeRoom {
  readonly id: string;
  readonly versionId: string;
  readonly packageCode: string;
  readonly currentSceneCode: string;
  readonly state: ApiRuntimeState;
  readonly events: readonly unknown[];
  readonly seats: readonly ApiRuntimeSeat[];
  readonly revision: number;
}

export interface ApiRuntimeSeat {
  readonly seatId: string;
  readonly roleCode: string;
  readonly playerId: string | null;
  readonly connected: boolean;
  readonly lastSeenAt: string | null;
}

export interface ApiRuntimeSnapshot {
  readonly roomId: string;
  readonly revision: number;
  readonly packageCode: string;
  readonly phase: string;
  readonly roles: readonly unknown[];
  readonly visibleClues: readonly unknown[];
  readonly seat?: ApiRuntimeSeat;
  readonly privateRole?: unknown;
  readonly seats?: readonly ApiRuntimeSeat[];
}

export interface ApiRuntimeState {
  readonly revealedClues: readonly string[];
  readonly phase: string;
  readonly npcEvents: readonly { readonly npcCode: string; readonly event: string }[];
}

export interface ApiNpcResponse {
  readonly speech: string;
  readonly confidence: number;
  readonly proposals: readonly unknown[];
  readonly shadowValidation: {
    readonly accepted: boolean;
    readonly results: readonly unknown[];
  };
}

export interface CompileStoryBibleDraftResult {
  readonly draftPackage: unknown;
  readonly flowDiagnostics: readonly unknown[];
  readonly simulationDiagnostics: readonly unknown[];
}

export interface StudioGenerateStoryBibleRequest {
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

export interface StudioDiagnostic {
  readonly severity: "info" | "warning" | "error";
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface StudioGenerationAttempt {
  readonly attempt: number;
  readonly accepted: boolean;
  readonly storyBible: unknown;
  readonly criticDiagnostics: readonly StudioDiagnostic[];
  readonly storyBibleDiagnostics: readonly StudioDiagnostic[];
}

export interface StudioGenerateStoryBibleResult {
  readonly storyBible: unknown;
  readonly attempts: readonly StudioGenerationAttempt[];
  readonly criticDiagnostics: readonly StudioDiagnostic[];
}

export interface PublishReviewBlocker {
  readonly source: "quality_gate" | "golden_regression";
  readonly code: string;
  readonly path: string;
  readonly message?: string;
}

export interface PublishReviewSummary {
  readonly packageId: string;
  readonly title?: string;
  readonly packageCode?: string;
  readonly readyForPublish: boolean;
  readonly checks: {
    readonly qualityGate?: { readonly readyForPublish?: boolean; readonly summary?: QualityCounts; readonly diagnostics?: readonly unknown[] };
    readonly goldenRegression?: GoldenRegressionSummary;
  };
  readonly blockers: readonly PublishReviewBlocker[];
}

export interface QualityCounts {
  readonly errors: number;
  readonly warnings: number;
  readonly info: number;
}

export interface GoldenRegressionSummary {
  readonly passed: boolean;
  readonly total: number;
  readonly failed: number;
  readonly failures: readonly { readonly name: string; readonly differences: readonly string[]; readonly qualityReadyForPublish: boolean }[];
}

export interface ApiPublishedVersion {
  readonly id: string;
  readonly semver: string;
  readonly state: "released";
  readonly content?: unknown;
}

export interface ThemeAssetJob {
  readonly id?: string;
  readonly jobId?: string;
  readonly status: "queued" | "running" | "failed" | "completed";
  readonly requestedAssets: readonly unknown[];
  readonly generatedAssets?: readonly { readonly assetCode: string; readonly uri: string; readonly provider: string }[];
  readonly failure?: { readonly code: string; readonly message: string };
  readonly [key: string]: unknown;
}


export interface GenerationJob {
  readonly jobId: string;
  readonly id?: string;
  readonly status: string;
  readonly currentStage: GenerationJobUiStage;
  readonly progressPercent: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly input: { readonly title?: string; readonly premise: string; readonly playerCount: number; readonly genre?: string };
  readonly stages: readonly GenerationJobStageDetail[];
  readonly activity: readonly GenerationJobActivity[];
  readonly result: GenerationJobDetailResult;
  readonly attempts?: readonly unknown[];
  readonly selectedAttemptId?: string | null;
  readonly draftPackageId?: string | null;
}

export type GenerationJobUiStage =
  | "queued"
  | "received_brief"
  | "planning_story"
  | "criticizing_story"
  | "compiling_draft"
  | "deterministic_review"
  | "ready_for_review"
  | "blocked"
  | "failed";

export type GenerationJobStageState = "pending" | "active" | "completed" | "blocked" | "failed";
export type GenerationJobActivityLevel = "info" | "success" | "warning" | "error";

export interface GenerationJobIssue {
  readonly severity: "info" | "warning" | "error";
  readonly code: string;
  readonly path?: string;
  readonly message: string;
}

export interface GenerationJobStageDetail {
  readonly key: GenerationJobUiStage;
  readonly label: string;
  readonly description: string;
  readonly state: GenerationJobStageState;
  readonly diagnostics?: readonly GenerationJobIssue[];
}

export interface GenerationJobActivity {
  readonly id: string;
  readonly stage?: GenerationJobUiStage;
  readonly level: GenerationJobActivityLevel;
  readonly message: string;
  readonly code?: string;
  readonly timestamp?: string;
  readonly details?: unknown;
}

export interface GenerationJobDetailResult {
  readonly storyBibleSummary?: {
    readonly title: string;
    readonly logline: string;
    readonly genre: string;
    readonly tone: string;
    readonly roleCount: number;
    readonly clueCount: number;
    readonly actCount: number;
    readonly timelineCount: number;
  };
  readonly criticReview?: {
    readonly passed: boolean;
    readonly severity: "info" | "warning" | "error";
    readonly issueCount: number;
    readonly requiredRevisions: readonly GenerationJobIssue[];
  };
  readonly scriptPackageDraftSummary?: {
    readonly title: string;
    readonly packageCode: string;
    readonly status: "draft" | "released";
    readonly roleCount: number;
    readonly clueCount: number;
    readonly sceneCount: number;
  };
  readonly qualityReport?: {
    readonly readyForPublish: boolean;
    readonly errorCount: number;
    readonly warningCount: number;
    readonly issueCount: number;
    readonly issues: readonly GenerationJobIssue[];
  };
  readonly readyForPublish: boolean | null;
  readonly draftPackageId: string | null;
  readonly errors: readonly GenerationJobIssue[];
}

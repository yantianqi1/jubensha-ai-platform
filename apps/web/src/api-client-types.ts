export interface ApiClientOptions {
  readonly fetch?: typeof fetch;
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

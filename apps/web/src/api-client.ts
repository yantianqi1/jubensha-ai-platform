import type { ThemeAssetManifest } from "@jubensha/dsl";
import type {
  ApiClientOptions,
  ApiErrorResponseBody,
  ApiNpcResponse,
  ApiPublishedVersion,
  ApiRuntimeRoom,
  ApiRuntimeSnapshot,
  CompileStoryBibleDraftResult,
  PlayableDemoResult,
  PublishReviewSummary,
  ThemeAssetJob,
} from "./api-client-types.js";

export type {
  ApiClientOptions,
  ApiErrorResponseBody,
  ApiNpcResponse,
  ApiPublishedVersion,
  ApiRuntimeRoom,
  ApiRuntimeSeat,
  ApiRuntimeSnapshot,
  ApiRuntimeState,
  CompileStoryBibleDraftResult,
  GoldenRegressionSummary,
  PlayableDemoResult,
  PublishReviewBlocker,
  PublishReviewSummary,
  QualityCounts,
  ThemeAssetJob,
} from "./api-client-types.js";

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
  readonly storyBibleDiagnostics: readonly StudioDiagnostic[];
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly responseBody: ApiErrorResponseBody;

  constructor(status: number, responseBody: ApiErrorResponseBody) {
    super(createApiClientErrorMessage(status, responseBody));
    this.name = "ApiClientError";
    this.status = status;
    this.errorCode = responseBody.error;
    this.responseBody = responseBody;
  }
}

export function createApiClient(baseUrl: string, options: ApiClientOptions = {}) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const fetchImpl = options.fetch ?? fetch;

  return {
    urls: {
      packages: () => `${normalizedBaseUrl}/content/packages`,
      demoFogHarbor: () => `${normalizedBaseUrl}/demo/fog-harbor`,
      askNpc: (roomId: string, npcCode: string) =>
        `${normalizedBaseUrl}/generation/rooms/${roomId}/npc/${npcCode}/ask`,
      room: (roomId: string) => `${normalizedBaseUrl}/runtime/rooms/${roomId}`,
      runtimeRooms: () => `${normalizedBaseUrl}/runtime/rooms`,
      roomActions: (roomId: string) => `${normalizedBaseUrl}/runtime/rooms/${roomId}/actions`,
      compileStoryBibleDraft: () => `${normalizedBaseUrl}/creation/story-bibles/compile-draft`,
      compileThemeAssets: () => `${normalizedBaseUrl}/creation/theme-assets/compile`,
      themeAssetJobs: () => `${normalizedBaseUrl}/creation/theme-assets/jobs`,
      themeAssetJob: (jobId: string) => `${normalizedBaseUrl}/creation/theme-assets/jobs/${jobId}`,
      runThemeAssetJob: (jobId: string) => `${normalizedBaseUrl}/creation/theme-assets/jobs/${jobId}/run`,
      generateStoryBible: () => `${normalizedBaseUrl}/creation/story-bibles/generate`,
      publishReview: (packageId: string) => `${normalizedBaseUrl}/creation/publish-review/packages/${packageId}`,
      publishDraft: (packageId: string) => `${normalizedBaseUrl}/content/packages/${packageId}/publish`,
    },
    async startFogHarborDemo(): Promise<PlayableDemoResult> {
      return postJson(`${normalizedBaseUrl}/demo/fog-harbor`, {}, fetchImpl);
    },
    async askNpc(roomId: string, npcCode: string, message: string): Promise<ApiNpcResponse> {
      return postJson(
        `${normalizedBaseUrl}/generation/rooms/${roomId}/npc/${npcCode}/ask`,
        { message },
        fetchImpl,
      );
    },
    async getRoom(roomId: string): Promise<ApiRuntimeRoom> {
      return readJson(`${normalizedBaseUrl}/runtime/rooms/${roomId}`, fetchImpl);
    },
    async createRuntimeRoom(versionId: string, seatCount: number): Promise<ApiRuntimeRoom> {
      return postJson(`${normalizedBaseUrl}/runtime/rooms`, { versionId, seatCount }, fetchImpl);
    },
    async joinSeat(roomId: string, seatId: string, playerId: string): Promise<ApiRuntimeRoom> {
      return postJson(
        `${normalizedBaseUrl}/runtime/rooms/${roomId}/seats/${seatId}/join`,
        { playerId },
        fetchImpl,
      );
    },
    async getPublicSnapshot(roomId: string): Promise<ApiRuntimeSnapshot> {
      return readJson(`${normalizedBaseUrl}/runtime/rooms/${roomId}/snapshot`, fetchImpl);
    },
    async getSeatSnapshot(roomId: string, seatId: string): Promise<ApiRuntimeSnapshot> {
      return readJson(`${normalizedBaseUrl}/runtime/rooms/${roomId}/seats/${seatId}/snapshot`, fetchImpl);
    },
    async getAdminSnapshot(roomId: string): Promise<ApiRuntimeSnapshot> {
      return readJson(`${normalizedBaseUrl}/runtime/rooms/${roomId}/admin-snapshot`, fetchImpl);
    },
    async applyRoomAction(
      roomId: string,
      actionCode: string,
      expectedRevision: number,
    ): Promise<ApiRuntimeRoom> {
      return postJson(
        `${normalizedBaseUrl}/runtime/rooms/${roomId}/actions`,
        { actionCode, expectedRevision },
        fetchImpl,
      );
    },
    async compileStoryBibleDraft(storyBible: unknown): Promise<CompileStoryBibleDraftResult> {
      return postJson(
        `${normalizedBaseUrl}/creation/story-bibles/compile-draft`,
        { storyBible },
        fetchImpl,
      );
    },
    async compileThemeAssets(storyBible: unknown): Promise<ThemeAssetManifest> {
      return postJson(`${normalizedBaseUrl}/creation/theme-assets/compile`, { storyBible }, fetchImpl);
    },
    async createThemeAssetJob(storyBible: unknown): Promise<ThemeAssetJob> {
      return postJson(`${normalizedBaseUrl}/creation/theme-assets/jobs`, { storyBible }, fetchImpl);
    },
    async getThemeAssetJob(jobId: string): Promise<ThemeAssetJob> {
      return readJson(`${normalizedBaseUrl}/creation/theme-assets/jobs/${jobId}`, fetchImpl);
    },
    async runThemeAssetJob(jobId: string): Promise<ThemeAssetJob> {
      return postJson(`${normalizedBaseUrl}/creation/theme-assets/jobs/${jobId}/run`, {}, fetchImpl);
    },
    async generateStoryBible(
      request: StudioGenerateStoryBibleRequest,
    ): Promise<StudioGenerateStoryBibleResult> {
      return postJson(`${normalizedBaseUrl}/creation/story-bibles/generate`, request, fetchImpl);
    },
    async getPublishReview(packageId: string): Promise<PublishReviewSummary> {
      return readJson(`${normalizedBaseUrl}/creation/publish-review/packages/${packageId}`, fetchImpl);
    },
    async publishDraft(packageId: string, semver: string): Promise<ApiPublishedVersion> {
      return postJson(`${normalizedBaseUrl}/content/packages/${packageId}/publish`, { semver }, fetchImpl);
    },
  };
}

async function postJson<T>(url: string, body: unknown, fetchImpl: typeof fetch): Promise<T> {
  return readResponse(
    await fetchWithUrl(url, fetchImpl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function readJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  return readResponse(await fetchWithUrl(url, fetchImpl));
}

async function fetchWithUrl(url: string, fetchImpl: typeof fetch, init?: RequestInit): Promise<Response> {
  try {
    return await fetchImpl(url, init);
  } catch (error) {
    throw new Error(`API request failed before response: ${url}: ${readFetchError(error)}`);
  }
}

function readFetchError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown fetch error";
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await readApiError(response);
  }

  return response.json() as Promise<T>;
}

async function readApiError(response: Response): Promise<Error> {
  const responseBody = await readApiErrorBody(response);

  if (!isApiErrorResponseBody(responseBody)) {
    return new Error(`API request failed: ${response.status}: response body is not an API error`);
  }

  return new ApiClientError(response.status, responseBody);
}

async function readApiErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`API request failed: ${response.status}: response body is not valid JSON`);
  }
}

function isApiErrorResponseBody(value: unknown): value is ApiErrorResponseBody {
  if (!isObjectRecord(value)) {
    return false;
  }

  return typeof value.error === "string" && typeof value.message === "string";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createApiClientErrorMessage(status: number, body: ApiErrorResponseBody): string {
  return `API request failed: ${status} ${body.error}: ${body.message}`;
}

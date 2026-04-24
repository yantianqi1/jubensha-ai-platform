export interface ApiClientOptions {
  readonly fetch?: typeof fetch;
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
  };
}

async function postJson<T>(url: string, body: unknown, fetchImpl: typeof fetch): Promise<T> {
  return readResponse(
    await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function readJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  return readResponse(await fetchImpl(url));
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

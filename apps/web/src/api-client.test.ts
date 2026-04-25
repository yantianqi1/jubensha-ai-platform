import { describe, expect, it } from "vitest";
import { ApiClientError, createApiClient } from "./api-client.js";

describe("API client", () => {
  it("builds resource URLs from a base url", () => {
    const client = createApiClient("http://127.0.0.1:3001");

    expect(client.urls.packages()).toBe("http://127.0.0.1:3001/content/packages");
    expect(client.urls.demoFogHarbor()).toBe("http://127.0.0.1:3001/demo/fog-harbor");
  });

  it("builds npc ask request payloads", async () => {
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ speech: "ok", confidence: 1, proposals: [], shadowValidation: { accepted: true, results: [] } }), { status: 200 });
      },
    });

    await client.askNpc("room_1", "butler", "你在哪里？");

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/generation/rooms/room_1/npc/butler/ask");
    expect(JSON.parse(String(requests[0]?.body))).toEqual({ message: "你在哪里？" });
  });


  it("creates and runs generation jobs", async () => {
    const request = { premise: "雾港旧账", playerCount: 4 };
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ id: "generation_job_1", status: "queued", attempts: [] }), { status: 200 });
      },
    });

    await client.createGenerationJob(request);
    await client.runGenerationJob("generation_job_1");
    await client.getGenerationJob("generation_job_1");

    expect(requests.map((entry) => entry.url)).toEqual([
      "http://127.0.0.1:3001/creation/generation-jobs",
      "http://127.0.0.1:3001/creation/generation-jobs/generation_job_1/run",
      "http://127.0.0.1:3001/creation/generation-jobs/generation_job_1",
    ]);
    expect(JSON.parse(String(requests[0]?.body))).toEqual(request);
    expect(JSON.parse(String(requests[1]?.body))).toEqual({});
  });

  it("builds story bible compile draft request payloads", async () => {
    const storyBible = { meta: { title: "雾港新案" } };
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ diagnostics: [], draft: { packageCode: "fog" } }), { status: 200 });
      },
    });

    await client.compileStoryBibleDraft(storyBible);

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/creation/story-bibles/compile-draft");
    expect(requests[0]?.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.body))).toEqual({ storyBible });
  });

  it("builds theme asset compile request payloads", async () => {
    const storyBible = { meta: { title: "雾港新案" } };
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ story_title: "雾港新案", theme_token: {}, assets: [] }), {
          status: 200,
        });
      },
    });

    await client.compileThemeAssets(storyBible);

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/creation/theme-assets/compile");
    expect(requests[0]?.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.body))).toEqual({ storyBible });
  });

  it("builds theme asset job creation request payloads", async () => {
    const storyBible = { meta: { title: "雾港新案" } };
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ id: "theme_asset_job_1", status: "queued", requestedAssets: [] }), {
          status: 200,
        });
      },
    });

    await client.createThemeAssetJob(storyBible);

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/creation/theme-assets/jobs");
    expect(requests[0]?.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.body))).toEqual({ storyBible });
  });


  it("runs theme asset jobs explicitly", async () => {
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      operatorId: "operator_1",
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ id: "theme_asset_job_1", status: "running", requestedAssets: [] }), {
          status: 200,
        });
      },
    });

    await client.runThemeAssetJob("theme_asset_job_1");

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/creation/theme-assets/jobs/theme_asset_job_1/run");
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.headers).toMatchObject({ "x-operator-id": "operator_1" });
    expect(JSON.parse(String(requests[0]?.body))).toEqual({});
  });

  it("builds theme asset job inspection URLs", async () => {
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ id: "theme_asset_job_1", status: "queued", requestedAssets: [] }), {
          status: 200,
        });
      },
    });

    await client.getThemeAssetJob("theme_asset_job_1");

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/creation/theme-assets/jobs/theme_asset_job_1");
    expect(requests[0]?.method).toBeUndefined();
  });

  it("fetches publish review summaries by package id", async () => {
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001/", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ packageId: "pkg_1", readyForPublish: true, checks: {}, blockers: [] }), {
          status: 200,
        });
      },
    });

    await expect(client.getPublishReview("pkg_1")).resolves.toMatchObject({ readyForPublish: true });

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/creation/publish-review/packages/pkg_1");
    expect(requests[0]?.method).toBeUndefined();
  });


  it("publishes draft packages with explicit semver", async () => {
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      operatorId: "operator_1",
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ id: "version_1", semver: "1.0.0", state: "released" }), {
          status: 200,
        });
      },
    });

    await expect(client.publishDraft("pkg_1", "1.0.0")).resolves.toMatchObject({
      id: "version_1",
      semver: "1.0.0",
      state: "released",
    });

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/content/packages/pkg_1/publish");
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.headers).toMatchObject({ "x-operator-id": "operator_1" });
    expect(JSON.parse(String(requests[0]?.body))).toEqual({ semver: "1.0.0" });
  });


  it("builds runtime room creation and revision-aware action payloads", async () => {
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      playerId: "player_a",
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ id: "room_1", revision: 1, state: { phase: "open", revealedClues: [], npcEvents: [] } }), {
          status: 200,
        });
      },
    });

    await client.createRuntimeRoom("version_1", 4);
    await client.applyRoomAction("room_1", "inspect_window", 1);

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/runtime/rooms");
    expect(JSON.parse(String(requests[0]?.body))).toEqual({ versionId: "version_1", seatCount: 4 });
    expect(requests[1]?.url).toBe("http://127.0.0.1:3001/runtime/rooms/room_1/actions");
    expect(requests[1]?.headers).toMatchObject({ "x-player-id": "player_a" });
    expect(JSON.parse(String(requests[1]?.body))).toEqual({ actionCode: "inspect_window", expectedRevision: 1 });
  });

  it("sends matching player identity when joining a runtime seat", async () => {
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ id: "room_1", revision: 1, state: { phase: "open", revealedClues: [], npcEvents: [] } }), {
          status: 200,
        });
      },
    });

    await client.joinSeat("room_1", "seat_1", "player_a");

    expect(requests[0]?.headers).toMatchObject({ "x-player-id": "player_a" });
    expect(JSON.parse(String(requests[0]?.body))).toEqual({ playerId: "player_a" });
  });

  it("reads runtime public and seat snapshots explicitly", async () => {
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(JSON.stringify({ roomId: "room_1", revision: 0, roles: [], visibleClues: [] }), {
          status: 200,
        });
      },
    });

    await client.getPublicSnapshot("room_1");
    await client.getSeatSnapshot("room_1", "seat_1");

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/runtime/rooms/room_1/snapshot");
    expect(requests[1]?.url).toBe("http://127.0.0.1:3001/runtime/rooms/room_1/seats/seat_1/snapshot");
  });
  it("builds story bible generation request payloads", async () => {
    const request = {
      title: "雨夜钟楼",
      genre: "本格推理",
      playerCount: 4,
      durationMinutes: 120,
      difficulty: "standard",
      supernaturalAllowed: false,
      premise: "钟楼晚宴后，收藏家离奇死亡。",
      tone: "冷峻",
      themeStatement: "每个谎言都保护一个更深的真相。",
    };
    const requests: Array<RequestInit & { url: string }> = [];
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async (url, init) => {
        requests.push({ url, ...(init ?? {}) });
        return new Response(
          JSON.stringify({ storyBible: {}, attempts: [], criticDiagnostics: [] }),
          { status: 200 },
        );
      },
    });

    await client.generateStoryBible(request);

    expect(requests[0]?.url).toBe("http://127.0.0.1:3001/creation/story-bibles/generate");
    expect(requests[0]?.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.body))).toEqual(request);
  });

  it("includes request URL when fetch fails before a response", async () => {
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });

    await expect(client.startFogHarborDemo()).rejects.toThrow(
      "API request failed before response: http://127.0.0.1:3001/demo/fog-harbor: Failed to fetch",
    );
  });

  it("throws structured API errors without swallowing response details", async () => {
    const body = {
      error: "RuntimeRuleError",
      message: "Action blocked",
      diagnostics: [{ code: "blocked_action" }],
    };
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async () => new Response(JSON.stringify(body), { status: 409 }),
    });

    await expect(client.getRoom("room_1")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 409,
      errorCode: "RuntimeRuleError",
      responseBody: body,
      message: "API request failed: 409 RuntimeRuleError: Action blocked",
    });
  });

  it("surfaces malformed API error bodies explicitly", async () => {
    const client = createApiClient("http://127.0.0.1:3001", {
      fetch: async () => new Response("not-json", { status: 500 }),
    });

    await expect(client.getRoom("room_1")).rejects.toThrow(
      "API request failed: 500: response body is not valid JSON",
    );
  });

  it("exposes API client error instances for UI error boundaries", () => {
    const error = new ApiClientError(404, { error: "ContentNotFoundError", message: "Missing" });

    expect(error).toBeInstanceOf(Error);
    expect(error.errorCode).toBe("ContentNotFoundError");
  });

});

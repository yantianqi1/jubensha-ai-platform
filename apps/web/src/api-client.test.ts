import { describe, expect, it } from "vitest";
import { createApiClient } from "./api-client.js";

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

});

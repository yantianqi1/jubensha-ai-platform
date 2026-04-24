import { describe, expect, it } from "vitest";
import {
  OpenAiCompatibleModelProvider,
  createModelProviderFromEnv,
} from "./openai-compatible-model-provider.js";

describe("OpenAI compatible model provider", () => {
  it("posts chat completions requests to configured endpoint", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const provider = new OpenAiCompatibleModelProvider({
      baseUrl: "https://example.test/1",
      apiKey: "test-key",
      model: "deepseek-v4-pro-think",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }), {
          status: 200,
        });
      },
    });

    const result = await provider.completeJson({
      systemPrompt: "system",
      userPrompt: "user",
      jsonMode: true,
    });

    expect(result).toBe('{"ok":true}');
    expect(requests[0]?.url).toBe("https://example.test/1/chat/completions");
    expect(requests[0]?.init.headers).toMatchObject({ authorization: "Bearer test-key" });
    expect(JSON.parse(String(requests[0]?.init.body))).toMatchObject({
      model: "deepseek-v4-pro-think",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
    });
  });

  it("throws explicit error when provider env is incomplete", () => {
    expect(() => createModelProviderFromEnv({ MODEL_PROVIDER: "openai-compatible" })).toThrow(
      "OPENAI_COMPATIBLE_BASE_URL is required",
    );
  });
});

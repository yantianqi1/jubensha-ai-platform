import { describe, expect, it } from "vitest";
import {
  GenerationValidationError,
  parseProviderNpcResponse,
} from "./generation-errors.js";
import type { ModelCompletionInput } from "./model-provider.js";

describe("model provider boundary", () => {
  it("preserves prompt and json mode requirements", () => {
    const input: ModelCompletionInput = {
      systemPrompt: "system",
      userPrompt: "user",
      jsonMode: true,
    };

    expect(input.systemPrompt).toBe("system");
    expect(input.userPrompt).toBe("user");
    expect(input.jsonMode).toBe(true);
  });

  it("rejects invalid json text explicitly", () => {
    expect(() => parseProviderNpcResponse("not json")).toThrow(
      GenerationValidationError,
    );
  });

  it("rejects schema-invalid json explicitly", () => {
    expect(() =>
      parseProviderNpcResponse(JSON.stringify({ speech: "ok", confidence: 2, proposals: [] })),
    ).toThrow(GenerationValidationError);
  });
});

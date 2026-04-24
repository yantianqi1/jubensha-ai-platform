import { ScriptedDemoModelProvider } from "./scripted-demo-model-provider.js";
import type { ModelCompletionInput, ModelProvider } from "./model-provider.js";

export interface OpenAiCompatibleProviderOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly fetch?: typeof fetch;
}

export class OpenAiCompatibleModelProvider implements ModelProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async completeJson(input: ModelCompletionInput): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(createRequestBody(this.model, input)),
    });

    if (!response.ok) {
      throw new Error(`OpenAI compatible provider failed: ${response.status}`);
    }

    return readContent(await response.json());
  }
}

export function createModelProviderFromEnv(env: NodeJS.ProcessEnv): ModelProvider {
  if (env.MODEL_PROVIDER === "scripted-demo") {
    return new ScriptedDemoModelProvider();
  }

  if (env.MODEL_PROVIDER === "openai-compatible") {
    return new OpenAiCompatibleModelProvider({
      baseUrl: readRequiredEnv(env, "OPENAI_COMPATIBLE_BASE_URL"),
      apiKey: readRequiredEnv(env, "OPENAI_API_KEY"),
      model: readRequiredEnv(env, "OPENAI_COMPATIBLE_MODEL"),
    });
  }

  throw new Error("MODEL_PROVIDER must be openai-compatible or scripted-demo");
}

function createRequestBody(model: string, input: ModelCompletionInput) {
  return {
    model,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
    response_format: input.jsonMode ? { type: "json_object" } : undefined,
  };
}

function readContent(value: unknown): string {
  if (!isObjectRecord(value) || !Array.isArray(value.choices)) {
    throw new Error("OpenAI compatible provider returned no choices");
  }

  const firstChoice = value.choices[0];
  if (!isObjectRecord(firstChoice) || !isObjectRecord(firstChoice.message)) {
    throw new Error("OpenAI compatible provider returned no message");
  }

  const content = firstChoice.message.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("OpenAI compatible provider returned empty content");
  }

  return content;
}

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

import type { ModelCompletionInput, ModelProvider } from "./model-provider.js";
import type { NpcResponse } from "./npc-response-schema.js";

const WINDOW_TERMS = ["窗台", "划痕", "window"];

export class ScriptedDemoModelProvider implements ModelProvider {
  async completeJson(input: ModelCompletionInput): Promise<string> {
    return JSON.stringify(createDemoResponse(input));
  }
}

export function createDemoModelProviderFromEnv(env: NodeJS.ProcessEnv): ModelProvider {
  if (env.MODEL_PROVIDER === "scripted-demo") {
    return new ScriptedDemoModelProvider();
  }

  return new UnconfiguredModelProvider();
}

class UnconfiguredModelProvider implements ModelProvider {
  async completeJson(): Promise<string> {
    throw new Error("Model provider is not configured");
  }
}

function createDemoResponse(input: ModelCompletionInput): NpcResponse {
  if (mentionsWindow(input.userPrompt)) {
    return {
      speech: "窗台的划痕是昨夜留下的。我不该隐瞒：有人从那里翻进过宅邸。",
      confidence: 0.86,
      proposals: [
        {
          type: "reveal_clue",
          clue_code: "C-01",
          reason: "玩家提到窗台划痕",
        },
      ],
    };
  }

  return {
    speech: "雾太重了，但我记得钟声响过三次。你若继续追问窗台，也许会发现关键。",
    confidence: 0.72,
    proposals: [],
  };
}

function mentionsWindow(message: string): boolean {
  return WINDOW_TERMS.some((term) => message.toLowerCase().includes(term));
}

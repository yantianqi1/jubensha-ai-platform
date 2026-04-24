import { describe, expect, it } from "vitest";
import { parseProviderNpcResponse } from "./generation-errors.js";
import { ScriptedDemoModelProvider } from "./scripted-demo-model-provider.js";

describe("ScriptedDemoModelProvider", () => {
  it("returns a deterministic NPC answer for the fog harbor demo", async () => {
    const provider = new ScriptedDemoModelProvider();
    const output = await provider.completeJson({
      systemPrompt: "雾港失踪案\nNPC：管家 (butler)\n公开设定：沉默的宅邸管家。\n已揭示线索：C-01 窗台划痕: 窗台上有一道新鲜划痕。",
      userPrompt: "窗台怎么回事？",
      jsonMode: true,
    });

    const response = parseProviderNpcResponse(output);

    expect(response.speech).toContain("窗台");
    expect(response.proposals).toEqual([
      {
        type: "reveal_clue",
        clue_code: "C-01",
        reason: "玩家提到窗台划痕",
      },
    ]);
  });

  it("responds with a non-empty speech even for neutral questions", async () => {
    const provider = new ScriptedDemoModelProvider();
    const response = parseProviderNpcResponse(
      await provider.completeJson({
        systemPrompt: "雾港失踪案\nNPC：管家 (butler)",
        userPrompt: "你知道什么？",
        jsonMode: true,
      }),
    );

    expect(response.speech).toBeTruthy();
    expect(response.confidence).toBe(0.72);
  });
});

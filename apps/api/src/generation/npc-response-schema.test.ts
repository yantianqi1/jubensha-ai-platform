import { describe, expect, it } from "vitest";
import { parseNpcResponse, safeParseNpcResponse } from "./npc-response-schema.js";

describe("NPC response schema", () => {
  it("parses speech with no proposals", () => {
    const response = parseNpcResponse({
      speech: "我昨晚一直在厨房，没有离开。",
      proposals: [],
      confidence: 0.7,
    });

    expect(response.speech).toBe("我昨晚一直在厨房，没有离开。");
    expect(response.proposals).toEqual([]);
    expect(response.confidence).toBe(0.7);
  });

  it("parses a reveal clue proposal", () => {
    const response = parseNpcResponse({
      speech: "如果你坚持问窗台，我只能说那里确实有痕迹。",
      confidence: 1,
      proposals: [
        {
          type: "reveal_clue",
          clue_code: "C-01",
          reason: "玩家问到了窗台划痕",
        },
      ],
    });

    expect(response.proposals).toEqual([
      {
        type: "reveal_clue",
        clue_code: "C-01",
        reason: "玩家问到了窗台划痕",
      },
    ]);
  });

  it("rejects responses without speech", () => {
    const result = safeParseNpcResponse({ proposals: [], confidence: 0.5 });

    expect(result.success).toBe(false);
  });

  it("rejects unknown proposal types", () => {
    const result = safeParseNpcResponse({
      speech: "这件事我不能说。",
      confidence: 0.5,
      proposals: [{ type: "teleport", target: "act2" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects confidence outside zero to one", () => {
    const result = safeParseNpcResponse({
      speech: "我很确定。",
      confidence: 1.1,
      proposals: [],
    });

    expect(result.success).toBe(false);
  });
});

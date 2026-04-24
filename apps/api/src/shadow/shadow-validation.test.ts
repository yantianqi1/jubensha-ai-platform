import { describe, expect, it } from "vitest";
import type { RuntimeState, ScriptPackage } from "@jubensha/dsl";
import { validateNpcProposals } from "./shadow-validation.js";
import type { NpcProposal } from "../generation/npc-response-schema.js";

const scriptPackage: ScriptPackage = {
  package_code: "fog_harbor",
  title: "雾港失踪案",
  status: "released",
  semver: "1.0.0",
  roles: [
    { role_code: "butler", name: "管家", public_profile: "管家。" },
    { role_code: "doctor", name: "医生", public_profile: "医生。" },
  ],
  clues: [
    {
      clue_code: "C-01",
      title: "公开划痕",
      content: "窗台划痕。",
      initial_visibility: [{ kind: "public", value: "all" }],
      unlock_if: [],
    },
    {
      clue_code: "C-02",
      title: "医生私信",
      content: "医生收到的私信。",
      initial_visibility: [{ kind: "role", value: "doctor" }],
      unlock_if: [],
    },
  ],
  scenes: [
    {
      scene_code: "act1",
      phase: "interrogation",
      visible_to: [{ kind: "public", value: "all" }],
      actions: [],
      end_if: [{ op: "timer_expired" }],
      entry_if: [],
      win_rule_hooks: [],
    },
  ],
};

const state: RuntimeState = {
  flags: { pressure_high: false },
  inventory: [],
  revealedClues: [],
  timerExpired: false,
  phase: "interrogation",
  counters: {},
  seatCount: 1,
  npcEvents: [],
  messages: [],
  scores: { team: {}, role: {}, seat: {} },
};

describe("shadow proposal validation", () => {
  it("accepts empty proposals", () => {
    const result = validateNpcProposals(baseInput([]));

    expect(result.accepted).toBe(true);
    expect(result.results).toEqual([]);
  });

  it("accepts visible clue reveals", () => {
    const result = validateNpcProposals(
      baseInput([{ type: "reveal_clue", clue_code: "C-01", reason: "玩家问到窗台" }]),
    );

    expect(result.accepted).toBe(true);
    expect(result.results[0]).toMatchObject({ accepted: true, code: "accepted" });
  });

  it("rejects unknown clue reveals", () => {
    const result = validateNpcProposals(
      baseInput([{ type: "reveal_clue", clue_code: "missing", reason: "不存在" }]),
    );

    expect(result.accepted).toBe(false);
    expect(result.results[0]).toMatchObject({ accepted: false, code: "unknown_clue" });
  });

  it("rejects role-private clue reveals from another NPC", () => {
    const result = validateNpcProposals(
      baseInput([{ type: "reveal_clue", clue_code: "C-02", reason: "越权透露" }]),
    );

    expect(result.accepted).toBe(false);
    expect(result.results[0]).toMatchObject({ accepted: false, code: "visibility_denied" });
  });

  it("rejects unknown flags", () => {
    const result = validateNpcProposals(
      baseInput([{ type: "set_flag", flag: "missing", value: true, reason: "未知标记" }]),
    );

    expect(result.accepted).toBe(false);
    expect(result.results[0]).toMatchObject({ accepted: false, code: "unknown_flag" });
  });

  it("rejects unknown NPC event roles", () => {
    const result = validateNpcProposals(
      baseInput([
        { type: "npc_event", npc_code: "ghost", event: "appeared", reason: "未知 NPC" },
      ]),
    );

    expect(result.accepted).toBe(false);
    expect(result.results[0]).toMatchObject({ accepted: false, code: "unknown_npc" });
  });
});

function baseInput(proposals: readonly NpcProposal[]) {
  return {
    scriptPackage,
    state,
    npcCode: "butler",
    proposals,
  };
}

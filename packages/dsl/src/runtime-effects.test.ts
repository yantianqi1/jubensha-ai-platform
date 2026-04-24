import { describe, expect, it } from "vitest";
import {
  applyAction,
  applyEffect,
  applyEffects,
  applySceneAction,
  findSceneAction,
  type RuntimeState,
} from "./runtime.js";
import type { Effect, Scene } from "./schema.js";

const runtimeState: RuntimeState = {
  flags: {
    intro_done: true,
    door_open: false,
  },
  inventory: ["gloves", "letter"],
  revealedClues: ["C-01", "C-02"],
  timerExpired: true,
  phase: "investigation",
  counters: {
    accusations: 2,
  },
  seatCount: 4,
  npcEvents: [],
  messages: [],
  scores: {
    team: {
      truth_progress: 10,
    },
    role: {
      detective: {
        suspicion: 1,
      },
    },
    seat: {
      "1": {
        action_points: 2,
      },
    },
  },
};

describe("effect application", () => {
  it("adds revealed clues without duplicates", () => {
    const effect: Effect = { type: "reveal_clue", clue_code: "C-03" };
    const next = applyEffects([effect, effect], runtimeState);

    expect(next.revealedClues).toEqual(["C-01", "C-02", "C-03"]);
    expect(runtimeState.revealedClues).toEqual(["C-01", "C-02"]);
  });

  it("updates a known flag without mutating the input state", () => {
    const next = applyEffect({ type: "set_flag", flag: "door_open", value: true }, runtimeState);

    expect(next.flags.door_open).toBe(true);
    expect(runtimeState.flags.door_open).toBe(false);
  });

  it("throws when setting an unknown flag", () => {
    expect(() =>
      applyEffect({ type: "set_flag", flag: "unknown_flag", value: true }, runtimeState),
    ).toThrow("Unknown flag");
  });

  it("adds granted items without duplicates", () => {
    const effect: Effect = { type: "grant_item", item: "key" };
    const next = applyEffects([effect, effect], runtimeState);

    expect(next.inventory).toEqual(["gloves", "letter", "key"]);
  });

  it("advances phase", () => {
    const next = applyEffect({ type: "advance_phase", to: "vote" }, runtimeState);

    expect(next.phase).toBe("vote");
  });

  it("appends npc events and broadcast messages", () => {
    const next = applyEffects(
      [
        { type: "npc_event", npc_code: "butler", event: "panicked" },
        {
          type: "broadcast_message",
          to_scope: { kind: "public", value: "all" },
          message_code: "thunder",
        },
      ],
      runtimeState,
    );

    expect(next.npcEvents).toEqual([{ npcCode: "butler", event: "panicked" }]);
    expect(next.messages).toEqual([
      { toScope: { kind: "public", value: "all" }, messageCode: "thunder" },
    ]);
  });

  it("updates explicit score buckets", () => {
    const next = applyEffects(
      [
        { type: "score_delta", target: "team", key: "truth_progress", delta: 5 },
        {
          type: "score_delta",
          target: "role",
          target_value: "detective",
          key: "suspicion",
          delta: 2,
        },
        {
          type: "score_delta",
          target: "seat",
          target_value: "1",
          key: "action_points",
          delta: -1,
        },
      ],
      runtimeState,
    );

    expect(next.scores.team.truth_progress).toBe(15);
    expect(next.scores.role.detective?.suspicion).toBe(3);
    expect(next.scores.seat["1"]?.action_points).toBe(1);
  });

  it("throws when updating an unknown score bucket", () => {
    expect(() =>
      applyEffect({ type: "score_delta", target: "team", key: "missing", delta: 1 }, runtimeState),
    ).toThrow("Unknown score");
  });
});

describe("action execution", () => {
  const scene: Scene = {
    scene_code: "act2",
    phase: "investigation",
    visible_to: [{ kind: "public", value: "all" }],
    actions: [
      {
        code: "inspect_window",
        allow_if: [{ op: "inventory_has", item: "gloves" }],
        effect: [{ type: "reveal_clue", clue_code: "C-03" }],
      },
      {
        code: "open_safe",
        allow_if: [{ op: "inventory_has", item: "missing_key" }],
        effect: [{ type: "set_flag", flag: "door_open", value: true }],
      },
    ],
    end_if: [{ op: "timer_expired" }],
    entry_if: [],
    win_rule_hooks: [],
  };

  it("applies effects for available actions", () => {
    const next = applySceneAction(scene, "inspect_window", runtimeState);

    expect(next.revealedClues).toEqual(["C-01", "C-02", "C-03"]);
  });

  it("throws before applying unavailable actions", () => {
    expect(() => applyAction(findSceneAction(scene, "open_safe"), runtimeState)).toThrow(
      "Action is not available",
    );
  });

  it("throws for unknown scene action execution", () => {
    expect(() => applySceneAction(scene, "missing", runtimeState)).toThrow("Unknown action");
  });
});

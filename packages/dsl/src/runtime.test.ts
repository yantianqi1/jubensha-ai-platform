import { describe, expect, it } from "vitest";
import {
  evaluateCondition,
  evaluateConditions,
  findSceneAction,
  getAvailableActions,
  isActionAvailable,
  type RuntimeState,
} from "./runtime.js";
import type { Action, Condition, Scene } from "./schema.js";

const KNOWN_COUNTER_VALUE = 2;
const REQUIRED_COUNTER_VALUE = 3;
const SEAT_COUNT = 4;

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
    accusations: KNOWN_COUNTER_VALUE,
  },
  seatCount: SEAT_COUNT,
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

describe("evaluateCondition", () => {
  it("evaluates flag conditions against known flags", () => {
    expect(evaluateCondition({ op: "flag_true", flag: "intro_done" }, runtimeState)).toBe(true);
    expect(evaluateCondition({ op: "flag_false", flag: "door_open" }, runtimeState)).toBe(true);
  });

  it("throws for unknown flag references", () => {
    expect(() => evaluateCondition({ op: "flag_true", flag: "missing" }, runtimeState)).toThrow(
      "Unknown flag",
    );
  });

  it("evaluates inventory membership", () => {
    expect(evaluateCondition({ op: "inventory_has", item: "gloves" }, runtimeState)).toBe(true);
    expect(evaluateCondition({ op: "inventory_has", item: "knife" }, runtimeState)).toBe(false);
  });

  it("evaluates clue reveal state", () => {
    expect(evaluateCondition({ op: "clue_revealed", clue_code: "C-01" }, runtimeState)).toBe(true);
    expect(evaluateCondition({ op: "clue_revealed", clue_code: "C-99" }, runtimeState)).toBe(false);
  });

  it("requires all listed clues to be revealed", () => {
    const condition: Condition = { op: "all_clues_revealed", clue_codes: ["C-01", "C-02"] };
    expect(evaluateCondition(condition, runtimeState)).toBe(true);
  });

  it("evaluates timer and phase conditions", () => {
    expect(evaluateCondition({ op: "timer_expired" }, runtimeState)).toBe(true);
    expect(evaluateCondition({ op: "phase_eq", phase: "investigation" }, runtimeState)).toBe(true);
    expect(evaluateCondition({ op: "phase_eq", phase: "vote" }, runtimeState)).toBe(false);
  });

  it("evaluates known counters", () => {
    expect(
      evaluateCondition(
        { op: "counter_gte", counter: "accusations", value: KNOWN_COUNTER_VALUE },
        runtimeState,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { op: "counter_gte", counter: "accusations", value: REQUIRED_COUNTER_VALUE },
        runtimeState,
      ),
    ).toBe(false);
  });

  it("throws for unknown counter references", () => {
    expect(() =>
      evaluateCondition({ op: "counter_gte", counter: "missing", value: 1 }, runtimeState),
    ).toThrow("Unknown counter");
  });

  it("evaluates seat count", () => {
    expect(evaluateCondition({ op: "seat_count_gte", value: SEAT_COUNT }, runtimeState)).toBe(true);
    expect(evaluateCondition({ op: "seat_count_gte", value: SEAT_COUNT + 1 }, runtimeState)).toBe(false);
  });
});

describe("evaluateConditions", () => {
  it("returns true only when every condition passes", () => {
    expect(
      evaluateConditions(
        [
          { op: "flag_true", flag: "intro_done" },
          { op: "inventory_has", item: "gloves" },
        ],
        runtimeState,
      ),
    ).toBe(true);

    expect(
      evaluateConditions(
        [
          { op: "flag_true", flag: "intro_done" },
          { op: "inventory_has", item: "knife" },
        ],
        runtimeState,
      ),
    ).toBe(false);
  });
});

describe("action evaluators", () => {
  const guardedAction: Action = {
    code: "inspect_window",
    allow_if: [{ op: "inventory_has", item: "gloves" }],
    effect: [{ type: "reveal_clue", clue_code: "C-03" }],
  };

  const blockedAction: Action = {
    code: "open_safe",
    allow_if: [{ op: "inventory_has", item: "key" }],
    effect: [{ type: "set_flag", flag: "safe_opened", value: true }],
  };

  const scene: Scene = {
    scene_code: "act1",
    phase: "investigation",
    visible_to: [{ kind: "public", value: "all" }],
    actions: [guardedAction, blockedAction],
    end_if: [{ op: "timer_expired" }],
    entry_if: [],
    win_rule_hooks: [],
  };

  it("marks actions without guards as available", () => {
    const action: Action = { code: "wait", allow_if: [], effect: [] };
    expect(isActionAvailable(action, runtimeState)).toBe(true);
  });

  it("evaluates action guards", () => {
    expect(isActionAvailable(guardedAction, runtimeState)).toBe(true);
    expect(isActionAvailable(blockedAction, runtimeState)).toBe(false);
  });

  it("finds scene actions by code", () => {
    expect(findSceneAction(scene, "inspect_window")).toBe(guardedAction);
  });

  it("throws for missing scene action codes", () => {
    expect(() => findSceneAction(scene, "missing")).toThrow("Unknown action");
  });

  it("returns only available scene actions", () => {
    expect(getAvailableActions(scene, runtimeState)).toEqual([guardedAction]);
  });
});

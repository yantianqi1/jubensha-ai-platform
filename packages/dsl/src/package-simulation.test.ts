import { describe, expect, it } from "vitest";
import type { ScriptPackage } from "./package-schema.js";
import { simulateScriptPackage } from "./package-simulation.js";

const playablePackage: ScriptPackage = {
  package_code: "simulation_demo",
  title: "Simulation Demo",
  status: "draft",
  roles: [
    {
      role_code: "detective",
      name: "侦探",
      public_profile: "负责调查。",
    },
  ],
  clues: [
    {
      clue_code: "ledger",
      title: "账本",
      content: "账本记录了异常转账。",
      initial_visibility: [{ kind: "role", value: "detective" }],
      unlock_if: [],
    },
  ],
  scenes: [
    {
      scene_code: "intro",
      phase: "intro",
      entry_if: [],
      visible_to: [{ kind: "public", value: "all" }],
      actions: [
        {
          code: "begin",
          allow_if: [],
          effect: [{ type: "set_flag", flag: "intro_complete", value: true }],
        },
      ],
      end_if: [{ op: "flag_true", flag: "intro_complete" }],
      win_rule_hooks: [],
    },
    {
      scene_code: "investigation",
      phase: "investigation",
      entry_if: [{ op: "flag_true", flag: "intro_complete" }],
      visible_to: [{ kind: "public", value: "all" }],
      actions: [
        {
          code: "inspect",
          allow_if: [],
          effect: [{ type: "reveal_clue", clue_code: "ledger" }],
        },
      ],
      end_if: [{ op: "clue_revealed", clue_code: "ledger" }],
      win_rule_hooks: [],
    },
  ],
};

describe("simulateScriptPackage", () => {
  it("visits scenes and applies available actions in scene order", () => {
    const result = simulateScriptPackage(playablePackage);

    expect(result.visitedScenes).toEqual(["intro", "investigation"]);
    expect(result.appliedActions).toEqual([
      { sceneCode: "intro", actionCode: "begin" },
      { sceneCode: "investigation", actionCode: "inspect" },
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it("reports a deadlock when a scene cannot end and has no available actions", () => {
    const result = simulateScriptPackage({
      ...playablePackage,
      scenes: [
        {
          ...playablePackage.scenes[0],
          actions: [],
          end_if: [{ op: "flag_true", flag: "never_done" }],
        },
      ],
    });

    expect(result.visitedScenes).toEqual(["intro"]);
    expect(result.appliedActions).toEqual([]);
    expect(result.diagnostics).toEqual([
      {
        severity: "warning",
        code: "deadlock_scene",
        path: "scenes.intro",
        message: "Scene cannot end and has no available actions: intro",
      },
    ]);
  });
});

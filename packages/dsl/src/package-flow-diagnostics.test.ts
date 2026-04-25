import { describe, expect, it } from "vitest";
import type { ScriptPackage } from "./package-schema.js";
import { analyzeScriptPackageFlow, analyzeScriptPackageTruthSupport } from "./package-flow-diagnostics.js";

const basePackage: ScriptPackage = {
  package_code: "flow_demo",
  title: "Flow Demo",
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
      content: "账本被调换。",
      initial_visibility: [{ kind: "public", value: "all" }],
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

describe("analyzeScriptPackageFlow", () => {
  it("returns no diagnostics for a linear playable flow", () => {
    expect(analyzeScriptPackageFlow(basePackage)).toEqual([]);
  });

  it("reports scene entry conditions that cannot be satisfied", () => {
    const diagnostics = analyzeScriptPackageFlow({
      ...basePackage,
      scenes: [
        basePackage.scenes[0],
        {
          ...basePackage.scenes[1],
          entry_if: [{ op: "flag_true", flag: "missing_flag" }],
        },
      ],
    });

    expect(diagnostics).toEqual([
      {
        severity: "warning",
        code: "unsatisfied_scene_entry",
        path: "scenes.investigation.entry_if[0]",
        message: "Scene entry condition cannot be satisfied by previous scene effects: missing_flag",
      },
      {
        severity: "warning",
        code: "unreachable_scene",
        path: "scenes.investigation",
        message: "Scene cannot be reached from previous scene effects: investigation",
      },
    ]);
  });
});

describe("analyzeScriptPackageTruthSupport", () => {
  it("reports not evaluable when truth metadata is missing", () => {
    expect(analyzeScriptPackageTruthSupport(basePackage)).toEqual([
      {
        severity: "warning",
        code: "not_evaluable",
        path: "meta.truth",
        message: "ScriptPackage truth metadata is missing and cannot be evaluated",
      },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { parseScriptPackage, type ScriptPackage } from "./package-schema.js";
import { validateScriptPackageReferences } from "./package-validation.js";

function buildPackage(overrides: Partial<ScriptPackage> = {}): ScriptPackage {
  return parseScriptPackage({
    package_code: "fog_harbor",
    title: "雾港失踪案",
    status: "draft",
    roles: [
      {
        role_code: "butler",
        name: "管家",
        public_profile: "沉默的宅邸管家。",
      },
    ],
    clues: [
      {
        clue_code: "C-01",
        title: "窗台划痕",
        content: "窗台上有一道新鲜划痕。",
        initial_visibility: [{ kind: "public", value: "all" }],
        unlock_if: [],
      },
    ],
    scenes: [
      {
        scene_code: "act1",
        phase: "investigation",
        visible_to: [{ kind: "public", value: "all" }],
        actions: [
          {
            code: "inspect_window",
            allow_if: [{ op: "clue_revealed", clue_code: "C-01" }],
            effect: [
              { type: "reveal_clue", clue_code: "C-01" },
              { type: "npc_event", npc_code: "butler", event: "panicked" },
            ],
          },
        ],
        end_if: [{ op: "all_clues_revealed", clue_codes: ["C-01"] }],
        entry_if: [],
        win_rule_hooks: [],
      },
    ],
    ...overrides,
  });
}

describe("validateScriptPackageReferences", () => {
  it("returns no diagnostics for a valid package", () => {
    expect(validateScriptPackageReferences(buildPackage())).toEqual([]);
  });

  it("reports missing clue references from reveal effects", () => {
    const scriptPackage = buildPackage({
      scenes: [
        {
          ...buildPackage().scenes[0],
          actions: [
            {
              code: "inspect_window",
              allow_if: [],
              effect: [{ type: "reveal_clue", clue_code: "MISSING" }],
            },
          ],
        },
      ],
    });

    expect(validateScriptPackageReferences(scriptPackage)).toEqual([
      {
        severity: "error",
        code: "missing_clue",
        path: "scenes.act1.actions.inspect_window.effect[0].clue_code",
        message: "Missing clue reference: MISSING",
      },
    ]);
  });

  it("reports missing clue references from conditions", () => {
    const scriptPackage = buildPackage({
      clues: [],
      scenes: [
        {
          ...buildPackage().scenes[0],
          entry_if: [{ op: "clue_revealed", clue_code: "C-02" }],
          end_if: [{ op: "all_clues_revealed", clue_codes: ["C-03", "C-04"] }],
          actions: [],
        },
      ],
    });

    expect(validateScriptPackageReferences(scriptPackage)).toEqual([
      {
        severity: "error",
        code: "missing_clue",
        path: "scenes.act1.entry_if[0].clue_code",
        message: "Missing clue reference: C-02",
      },
      {
        severity: "error",
        code: "missing_clue",
        path: "scenes.act1.end_if[0].clue_codes[0]",
        message: "Missing clue reference: C-03",
      },
      {
        severity: "error",
        code: "missing_clue",
        path: "scenes.act1.end_if[0].clue_codes[1]",
        message: "Missing clue reference: C-04",
      },
    ]);
  });

  it("reports missing NPC role references", () => {
    const scriptPackage = buildPackage({
      roles: [
        {
          role_code: "detective",
          name: "侦探",
          public_profile: "外来的调查者。",
        },
      ],
    });

    expect(validateScriptPackageReferences(scriptPackage)).toEqual([
      {
        severity: "error",
        code: "missing_role",
        path: "scenes.act1.actions.inspect_window.effect[1].npc_code",
        message: "Missing role reference: butler",
      },
    ]);
  });

  it("keeps duplicate missing references stable and explicit", () => {
    const scene = buildPackage().scenes[0];
    const scriptPackage = buildPackage({
      clues: [],
      scenes: [
        {
          ...scene,
          entry_if: [{ op: "clue_revealed", clue_code: "MISSING" }],
          end_if: [{ op: "clue_revealed", clue_code: "MISSING" }],
          actions: [],
        },
      ],
    });

    expect(validateScriptPackageReferences(scriptPackage)).toEqual([
      {
        severity: "error",
        code: "missing_clue",
        path: "scenes.act1.entry_if[0].clue_code",
        message: "Missing clue reference: MISSING",
      },
      {
        severity: "error",
        code: "missing_clue",
        path: "scenes.act1.end_if[0].clue_code",
        message: "Missing clue reference: MISSING",
      },
    ]);
  });
});

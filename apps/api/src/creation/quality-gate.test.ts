import { describe, expect, it } from "vitest";
import { QualityGate } from "./quality-gate.js";

const validPackage = {
  package_code: "quality_gate_case",
  title: "质量门禁样例",
  status: "draft" as const,
  roles: [{ role_code: "detective", name: "侦探", public_profile: "调查旧案。" }],
  clues: [
    {
      clue_code: "clue_1",
      title: "旧报纸",
      content: "旧报纸指向关键真相。",
      initial_visibility: [{ kind: "public" as const, value: "all" }],
      unlock_if: [],
    },
  ],
  scenes: [
    {
      scene_code: "intro",
      phase: "intro" as const,
      visible_to: [{ kind: "public" as const, value: "all" }],
      entry_if: [],
      actions: [],
      end_if: [{ op: "clue_revealed" as const, clue_code: "clue_1" }],
      win_rule_hooks: [],
    },
  ],
  meta: {
    summary: "用于质量门禁测试。",
    tags: ["golden"],
    player_count: 1,
    truth: "旧报纸揭示真相。",
  },
};

describe("QualityGate", () => {
  it("passes a valid draft package with deterministic diagnostics", () => {
    const result = new QualityGate().reviewPackage(validPackage);

    expect(result.readyForPublish).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("returns explicit diagnostics for invalid package shape", () => {
    const result = new QualityGate().reviewPackage({ title: "missing required fields" });

    expect(result.readyForPublish).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      severity: "error",
      code: "invalid_script_package",
      path: "$",
    });
  });

  it("summarizes diagnostics by severity for release governance", () => {
    const result = new QualityGate().reviewPackage({ ...validPackage, status: "released" });

    expect(result.readyForPublish).toBe(false);
    expect(result.summary).toEqual({ errors: 1, warnings: 0, info: 0 });
  });

  it("returns a human-readable pre-publish report", () => {
    const result = new QualityGate().reviewPackage({ ...validPackage, status: "released" });

    expect(result.report).toEqual({
      headline: "预发布检查未通过：1 个阻断项",
      readinessLabel: "blocked",
      sections: [
        "Errors: 1 / Warnings: 0 / Info: 0",
        "[error] release_semver_required at semver: Released packages must declare semver before publish review.",
      ],
    });
  });
});

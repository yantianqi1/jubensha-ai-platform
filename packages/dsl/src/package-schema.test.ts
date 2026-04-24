import { describe, expect, it } from "vitest";
import { ScriptPackageSchema, parseScriptPackage } from "./package-schema.js";

const minimalPackage = {
  package_code: "fog_harbor",
  title: "雾港失踪案",
  status: "draft" as const,
  roles: [
    {
      role_code: "detective",
      name: "侦探",
      public_profile: "外来的调查者。",
    },
  ],
  clues: [
    {
      clue_code: "C-01",
      title: "窗台划痕",
      content: "窗台上有一道新鲜划痕。",
      initial_visibility: [{ kind: "public" as const, value: "all" }],
      unlock_if: [],
    },
  ],
  scenes: [
    {
      scene_code: "act1",
      phase: "investigation" as const,
      visible_to: [{ kind: "public" as const, value: "all" }],
      actions: [],
      end_if: [{ op: "timer_expired" as const }],
      entry_if: [],
      win_rule_hooks: [],
    },
  ],
};

describe("ScriptPackageSchema", () => {
  it("accepts a minimal content package", () => {
    const result = ScriptPackageSchema.safeParse(minimalPackage);

    expect(result.success).toBe(true);
  });

  it("parses package content with inferred defaults", () => {
    const parsed = parseScriptPackage(minimalPackage);

    expect(parsed.package_code).toBe("fog_harbor");
    expect(parsed.roles[0]?.role_code).toBe("detective");
  });

  it("rejects duplicate role codes", () => {
    const result = ScriptPackageSchema.safeParse({
      ...minimalPackage,
      roles: [...minimalPackage.roles, minimalPackage.roles[0]],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Duplicate role_code");
  });

  it("rejects duplicate clue codes", () => {
    const result = ScriptPackageSchema.safeParse({
      ...minimalPackage,
      clues: [...minimalPackage.clues, minimalPackage.clues[0]],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Duplicate clue_code");
  });

  it("rejects duplicate scene codes", () => {
    const result = ScriptPackageSchema.safeParse({
      ...minimalPackage,
      scenes: [...minimalPackage.scenes, minimalPackage.scenes[0]],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Duplicate scene_code");
  });

  it("requires semver text when package is released", () => {
    const withoutVersion = ScriptPackageSchema.safeParse({
      ...minimalPackage,
      status: "released",
    });
    const withVersion = ScriptPackageSchema.safeParse({
      ...minimalPackage,
      status: "released",
      semver: "1.0.0",
    });

    expect(withoutVersion.success).toBe(false);
    expect(withoutVersion.error?.issues[0]?.message).toContain("semver");
    expect(withVersion.success).toBe(true);
  });
});

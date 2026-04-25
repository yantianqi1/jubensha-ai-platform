import { describe, expect, it } from "vitest";
import { PublishGate } from "./publish-gate.js";

const publishablePackage = {
  package_code: "publishable",
  title: "可发布样例",
  status: "draft" as const,
  roles: [{ role_code: "detective", name: "侦探", public_profile: "调查旧案。" }],
  clues: [
    {
      clue_code: "clue_1",
      title: "旧报纸",
      content: "旧报纸揭示真相。",
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
      actions: [
        { code: "inspect", allow_if: [], effect: [{ type: "reveal_clue" as const, clue_code: "clue_1" }] },
      ],
      end_if: [{ op: "clue_revealed" as const, clue_code: "clue_1" }],
      win_rule_hooks: [],
    },
  ],
  meta: { summary: "样例。", tags: [], player_count: 1, truth: "旧报纸揭示真相。" },
};

describe("PublishGate", () => {
  it("allows packages with no release blockers", () => {
    expect(new PublishGate().review(publishablePackage)).toEqual({ allowed: true, blockers: [] });
  });

  it("blocks packages missing truth evaluation metadata", () => {
    const result = new PublishGate().review({ ...publishablePackage, meta: undefined });

    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual([
      {
        code: "not_evaluable",
        path: "meta.truth",
        message: "ScriptPackage truth metadata is missing and cannot be evaluated",
      },
    ]);
  });
});

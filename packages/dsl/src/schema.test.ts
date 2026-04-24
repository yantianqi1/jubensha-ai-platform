import { describe, it, expect } from "vitest";
import { SceneSchema, parseScene, type Scene } from "./schema.js";

describe("SceneSchema", () => {
  const minimalScene = {
    scene_code: "act1_intro",
    phase: "intro" as const,
    visible_to: [{ kind: "seat" as const, value: "1" }],
    actions: [],
    end_if: [{ op: "flag_true" as const, flag: "intro_done" }],
  };

  it("accepts a minimal valid scene", () => {
    const result = SceneSchema.safeParse(minimalScene);
    expect(result.success).toBe(true);
  });

  it("rejects scene without scene_code", () => {
    const bad = { ...minimalScene, scene_code: undefined };
    const result = SceneSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects scene with unknown phase", () => {
    const bad = { ...minimalScene, phase: "mystery_phase" };
    const result = SceneSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  describe("visibility scope (5-level)", () => {
    const scopes = ["system", "role", "seat", "group", "public"];

    for (const scope of scopes) {
      it(`accepts visibility scope "${scope}"`, () => {
        const scene = {
          ...minimalScene,
          visible_to: [{ kind: scope, value: "x" }],
        };
        const result = SceneSchema.safeParse(scene);
        expect(result.success).toBe(true);
      });
    }

    it("rejects unknown visibility scope", () => {
      const scene = {
        ...minimalScene,
        visible_to: [{ kind: "cosmic", value: "x" }],
      };
      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(false);
    });
  });

  describe("actions", () => {
    it("accepts action with allow_if guard and reveal_clue effect", () => {
      const scene = {
        ...minimalScene,
        actions: [
          {
            code: "inspect_window",
            allow_if: [{ op: "inventory_has", item: "gloves" }],
            effect: [{ type: "reveal_clue", clue_code: "C-12" }],
          },
        ],
      };
      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(true);
    });

    it("accepts set_flag and grant_item effects", () => {
      const scene = {
        ...minimalScene,
        actions: [
          {
            code: "find_letter",
            effect: [
              { type: "set_flag", flag: "letter_found", value: true },
              { type: "grant_item", item: "letter" },
            ],
          },
        ],
      };
      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(true);
    });

    it("rejects unknown effect type", () => {
      const scene = {
        ...minimalScene,
        actions: [
          {
            code: "bad",
            effect: [{ type: "teleport_to_moon" }],
          },
        ],
      };
      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(false);
    });
  });

  describe("timer", () => {
    it("accepts timer_sec as positive integer", () => {
      const scene = { ...minimalScene, timer_sec: 900 };
      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(true);
    });

    it("rejects negative timer_sec", () => {
      const scene = { ...minimalScene, timer_sec: -5 };
      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(false);
    });
  });

  describe("LLM hints (optional)", () => {
    it("accepts llm_role_hints with preset + constraints", () => {
      const scene = {
        ...minimalScene,
        llm_role_hints: {
          director: { tone: "tense", tempo: "slow" },
          npcs: {
            "npc-1": {
              preset: "evasive_suspect",
              forbidden_reveals: ["clue:C-12"],
            },
          },
        },
      };
      const result = SceneSchema.safeParse(scene);
      expect(result.success).toBe(true);
    });
  });

  it("TS type inference works", () => {
    const scene: Scene = parseScene(minimalScene);
    expect(scene.scene_code).toBe("act1_intro");
  });
});

describe("parseScene", () => {
  it("throws on invalid input with zod error message", () => {
    expect(() => parseScene({ scene_code: 1 })).toThrow();
  });
});

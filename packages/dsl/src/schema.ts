import { z } from "zod";

/**
 * Scene DSL v0.1 — 剧本杀场景描述语言
 *
 * 设计准则：
 * - schema 是唯一真源；TS 类型、JSON Schema、运行时校验都从它推导
 * - 条件/效果是"标签联合"，便于未来扩展 op 而不破坏旧剧本
 * - LLM 相关字段全部可选；规则机先跑通，不强求创作者写 hints
 */

// ---- 5 级 visibility 作用域 ----

export const VisibilityKind = z.enum(["system", "role", "seat", "group", "public"]);
export type VisibilityKind = z.infer<typeof VisibilityKind>;

export const ScopeRef = z.object({
  kind: VisibilityKind,
  value: z.string().min(1),
});
export type ScopeRef = z.infer<typeof ScopeRef>;

// ---- 阶段枚举（覆盖 5 本型通用阶段） ----

export const ScenePhase = z.enum([
  "intro",
  "investigation",
  "interrogation",
  "emotion",
  "vote",
  "reveal",
  "epilogue",
  "custom",
]);
export type ScenePhase = z.infer<typeof ScenePhase>;

// ---- 条件表达式（声明式，引擎可审计） ----

export const Condition = z.discriminatedUnion("op", [
  z.object({ op: z.literal("flag_true"), flag: z.string() }),
  z.object({ op: z.literal("flag_false"), flag: z.string() }),
  z.object({ op: z.literal("inventory_has"), item: z.string() }),
  z.object({ op: z.literal("clue_revealed"), clue_code: z.string() }),
  z.object({ op: z.literal("all_clues_revealed"), clue_codes: z.array(z.string()).min(1) }),
  z.object({ op: z.literal("timer_expired") }),
  z.object({ op: z.literal("phase_eq"), phase: ScenePhase }),
  z.object({
    op: z.literal("counter_gte"),
    counter: z.string(),
    value: z.number().int(),
  }),
  z.object({ op: z.literal("seat_count_gte"), value: z.number().int().positive() }),
]);
export type Condition = z.infer<typeof Condition>;

// ---- 效果（引擎应用到状态机） ----

export const Effect = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reveal_clue"),
    clue_code: z.string(),
    to_scope: ScopeRef.optional(),
  }),
  z.object({
    type: z.literal("set_flag"),
    flag: z.string(),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("grant_item"),
    item: z.string(),
    to_scope: ScopeRef.optional(),
  }),
  z.object({
    type: z.literal("advance_phase"),
    to: ScenePhase,
  }),
  z.object({
    type: z.literal("npc_event"),
    npc_code: z.string(),
    event: z.string(),
  }),
  z.object({
    type: z.literal("score_delta"),
    target: z.enum(["team", "role", "seat"]),
    target_value: z.string().optional(),
    key: z.string(),
    delta: z.number(),
  }),
  z.object({
    type: z.literal("broadcast_message"),
    to_scope: ScopeRef,
    message_code: z.string(),
  }),
]);
export type Effect = z.infer<typeof Effect>;

// ---- 行动 ----

export const Action = z.object({
  code: z.string().min(1),
  label: z.string().optional(),
  allow_if: z.array(Condition).default([]),
  visible_to: z.array(ScopeRef).optional(),
  cost: z
    .object({
      action_points: z.number().int().nonnegative().optional(),
      cooldown_sec: z.number().int().nonnegative().optional(),
    })
    .optional(),
  effect: z.array(Effect).default([]),
  llm_hint: z
    .object({
      narrate_with: z.enum(["director", "scene", "npc"]).optional(),
      npc_code: z.string().optional(),
      style: z.string().optional(),
    })
    .optional(),
});
export type Action = z.infer<typeof Action>;

// ---- LLM 提示（按本型差异化介入度） ----

export const LlmRoleHints = z
  .object({
    director: z
      .object({
        tone: z.string().optional(),
        tempo: z.enum(["slow", "medium", "fast"]).optional(),
        style_notes: z.string().optional(),
      })
      .optional(),
    scene_narrator: z
      .object({
        ambience: z.string().optional(),
        sensory_focus: z.array(z.string()).optional(),
      })
      .optional(),
    npcs: z
      .record(
        z.string(),
        z.object({
          preset: z.string().optional(),
          forbidden_reveals: z.array(z.string()).default([]),
          pressure_triggers: z.array(z.string()).optional(),
          style: z.string().optional(),
        }),
      )
      .optional(),
  })
  .optional();
export type LlmRoleHints = z.infer<typeof LlmRoleHints>;

// ---- Scene ----

export const SceneSchema = z.object({
  scene_code: z.string().min(1),
  title: z.string().optional(),
  phase: ScenePhase,
  entry_if: z.array(Condition).default([]),
  visible_to: z.array(ScopeRef).min(1),
  timer_sec: z.number().int().positive().optional(),
  actions: z.array(Action).default([]),
  end_if: z.array(Condition).min(1),
  win_rule_hooks: z.array(z.string()).default([]),
  llm_role_hints: LlmRoleHints,
  meta: z
    .object({
      script_type: z
        .enum(["mystery", "emotion", "comedy", "horror", "mechanism"])
        .optional(),
      notes: z.string().optional(),
    })
    .optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

// ---- 解析 API ----

export function parseScene(input: unknown): Scene {
  return SceneSchema.parse(input);
}

export function safeParseScene(input: unknown) {
  return SceneSchema.safeParse(input);
}

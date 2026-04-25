import { z } from "zod";
import { Condition, SceneSchema, ScopeRef } from "./schema.js";

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export const ScriptRoleSchema = z.object({
  role_code: z.string().min(1),
  name: z.string().min(1),
  public_profile: z.string().min(1),
  private_secret: z.string().optional(),
  internal_state_schema: z.record(z.unknown()).optional(),
});
export type ScriptRole = z.infer<typeof ScriptRoleSchema>;

export const ScriptClueSchema = z.object({
  clue_code: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  initial_visibility: z.array(ScopeRef).min(1),
  unlock_if: z.array(Condition).default([]),
});
export type ScriptClue = z.infer<typeof ScriptClueSchema>;

export const ScriptPackageSchema = z
  .object({
    package_code: z.string().min(1),
    title: z.string().min(1),
    status: z.enum(["draft", "released"]),
    semver: z.string().regex(SEMVER_PATTERN).optional(),
    roles: z.array(ScriptRoleSchema).min(1),
    clues: z.array(ScriptClueSchema).default([]),
    scenes: z.array(SceneSchema).min(1),
    meta: z
      .object({
        summary: z.string().optional(),
        tags: z.array(z.string()).default([]),
        player_count: z.number().int().positive().optional(),
        truth: z.string().min(1).optional(),
      })
      .optional(),
  })
  .superRefine((scriptPackage, context) => {
    addDuplicateIssue(context, scriptPackage.roles, "role_code");
    addDuplicateIssue(context, scriptPackage.clues, "clue_code");
    addDuplicateIssue(context, scriptPackage.scenes, "scene_code");

    if (scriptPackage.status === "released" && !scriptPackage.semver) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["semver"],
        message: "released package requires semver",
      });
    }
  });
export type ScriptPackage = z.infer<typeof ScriptPackageSchema>;

export function parseScriptPackage(input: unknown): ScriptPackage {
  return ScriptPackageSchema.parse(input);
}

export function safeParseScriptPackage(input: unknown) {
  return ScriptPackageSchema.safeParse(input);
}

function addDuplicateIssue<T extends Record<string, unknown>>(
  context: z.RefinementCtx,
  items: readonly T[],
  key: keyof T & string,
): void {
  const seen = new Set<unknown>();

  for (const item of items) {
    const value = item[key];

    if (seen.has(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `Duplicate ${key}: ${String(value)}`,
      });
      return;
    }

    seen.add(value);
  }
}

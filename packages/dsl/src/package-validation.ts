import type { Condition, Effect, Scene } from "./schema.js";
import type { ScriptPackage } from "./package-schema.js";

export type PackageValidationCode = "missing_clue" | "missing_role";

export interface PackageDiagnostic {
  readonly severity: "error";
  readonly code: PackageValidationCode;
  readonly path: string;
  readonly message: string;
}

interface ReferenceContext {
  readonly clueCodes: ReadonlySet<string>;
  readonly roleCodes: ReadonlySet<string>;
}

export function validateScriptPackageReferences(
  scriptPackage: ScriptPackage,
): PackageDiagnostic[] {
  const context: ReferenceContext = {
    clueCodes: new Set(scriptPackage.clues.map((clue) => clue.clue_code)),
    roleCodes: new Set(scriptPackage.roles.map((role) => role.role_code)),
  };

  return scriptPackage.scenes.flatMap((scene) => validateSceneReferences(scene, context));
}

function validateSceneReferences(scene: Scene, context: ReferenceContext): PackageDiagnostic[] {
  return [
    ...validateConditions(scene.entry_if, `scenes.${scene.scene_code}.entry_if`, context),
    ...validateConditions(scene.end_if, `scenes.${scene.scene_code}.end_if`, context),
    ...scene.actions.flatMap((action) => [
      ...validateConditions(
        action.allow_if,
        `scenes.${scene.scene_code}.actions.${action.code}.allow_if`,
        context,
      ),
      ...validateEffects(
        action.effect,
        `scenes.${scene.scene_code}.actions.${action.code}.effect`,
        context,
      ),
    ]),
  ];
}

function validateConditions(
  conditions: readonly Condition[],
  path: string,
  context: ReferenceContext,
): PackageDiagnostic[] {
  return conditions.flatMap((condition, index) =>
    validateCondition(condition, `${path}[${index}]`, context),
  );
}

function validateCondition(
  condition: Condition,
  path: string,
  context: ReferenceContext,
): PackageDiagnostic[] {
  if (condition.op === "clue_revealed") {
    return missingClueDiagnostics([condition.clue_code], `${path}.clue_code`, context);
  }

  if (condition.op === "all_clues_revealed") {
    return condition.clue_codes.flatMap((clueCode, index) =>
      missingClueDiagnostics([clueCode], `${path}.clue_codes[${index}]`, context),
    );
  }

  return [];
}

function validateEffects(
  effects: readonly Effect[],
  path: string,
  context: ReferenceContext,
): PackageDiagnostic[] {
  return effects.flatMap((effect, index) => validateEffect(effect, `${path}[${index}]`, context));
}

function validateEffect(
  effect: Effect,
  path: string,
  context: ReferenceContext,
): PackageDiagnostic[] {
  if (effect.type === "reveal_clue") {
    return missingClueDiagnostics([effect.clue_code], `${path}.clue_code`, context);
  }

  if (effect.type === "npc_event" && !context.roleCodes.has(effect.npc_code)) {
    return [
      {
        severity: "error",
        code: "missing_role",
        path: `${path}.npc_code`,
        message: `Missing role reference: ${effect.npc_code}`,
      },
    ];
  }

  return [];
}

function missingClueDiagnostics(
  clueCodes: readonly string[],
  path: string,
  context: ReferenceContext,
): PackageDiagnostic[] {
  return clueCodes.flatMap((clueCode) => {
    if (context.clueCodes.has(clueCode)) {
      return [];
    }

    return [
      {
        severity: "error",
        code: "missing_clue",
        path,
        message: `Missing clue reference: ${clueCode}`,
      },
    ];
  });
}

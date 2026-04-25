import type { Condition, Effect } from "./schema.js";
import type { ScriptPackage } from "./package-schema.js";

export type PackageFlowDiagnosticCode =
  | "unsatisfied_scene_entry"
  | "unreachable_scene"
  | "not_evaluable";

export interface PackageFlowDiagnostic {
  readonly severity: "warning";
  readonly code: PackageFlowDiagnosticCode;
  readonly path: string;
  readonly message: string;
}

interface FlowFacts {
  readonly trueFlags: ReadonlySet<string>;
  readonly falseFlags: ReadonlySet<string>;
  readonly revealedClues: ReadonlySet<string>;
  readonly phases: ReadonlySet<string>;
}

export function analyzeScriptPackageFlow(
  scriptPackage: ScriptPackage,
): PackageFlowDiagnostic[] {
  const initialFacts = createInitialFacts(scriptPackage);

  return scriptPackage.scenes.reduce<PackageFlowDiagnostic[]>((diagnostics, scene, index) => {
    const previousScenes = scriptPackage.scenes.slice(0, index);
    const facts = previousScenes.reduce(applySceneFacts, initialFacts);

    return [
      ...diagnostics,
      ...diagnoseSceneEntryConditions(scene, facts),
      ...diagnoseUnreachableScene(scene, facts),
    ];
  }, []);
}

export function analyzeScriptPackageTruthSupport(
  scriptPackage: ScriptPackage,
): PackageFlowDiagnostic[] {
  if (hasTruthMetadata(scriptPackage)) {
    return [];
  }

  return [
    {
      severity: "warning",
      code: "not_evaluable",
      path: "meta.truth",
      message: "ScriptPackage truth metadata is missing and cannot be evaluated",
    },
  ];
}

function diagnoseSceneEntryConditions(
  scene: ScriptPackage["scenes"][number],
  facts: FlowFacts,
): PackageFlowDiagnostic[] {
  return scene.entry_if.flatMap((condition, conditionIndex) =>
    diagnoseCondition(condition, facts, `scenes.${scene.scene_code}.entry_if[${conditionIndex}]`),
  );
}

function diagnoseUnreachableScene(
  scene: ScriptPackage["scenes"][number],
  facts: FlowFacts,
): PackageFlowDiagnostic[] {
  if (!isSceneUnreachable(scene.entry_if, facts)) {
    return [];
  }

  return [
    {
      severity: "warning",
      code: "unreachable_scene",
      path: `scenes.${scene.scene_code}`,
      message: `Scene cannot be reached from previous scene effects: ${scene.scene_code}`,
    },
  ];
}

function createInitialFacts(scriptPackage: ScriptPackage): FlowFacts {
  return {
    trueFlags: new Set(),
    falseFlags: new Set(),
    revealedClues: new Set(readInitiallyVisibleClues(scriptPackage)),
    phases: new Set(),
  };
}

function readInitiallyVisibleClues(scriptPackage: ScriptPackage): string[] {
  return scriptPackage.clues
    .filter((clue) => clue.initial_visibility.some((scope) => scope.kind === "public"))
    .map((clue) => clue.clue_code);
}

function applySceneFacts(facts: FlowFacts, scene: ScriptPackage["scenes"][number]): FlowFacts {
  return scene.actions.reduce(
    (nextFacts, action) => action.effect.reduce(applyEffectFacts, nextFacts),
    addPhaseFact(facts, scene.phase),
  );
}

function addPhaseFact(facts: FlowFacts, phase: string): FlowFacts {
  return {
    ...facts,
    phases: new Set([...facts.phases, phase]),
  };
}

function applyEffectFacts(facts: FlowFacts, effect: Effect): FlowFacts {
  if (effect.type === "set_flag") {
    return addFlagFact(facts, effect.flag, effect.value);
  }

  if (effect.type === "reveal_clue") {
    return { ...facts, revealedClues: new Set([...facts.revealedClues, effect.clue_code]) };
  }

  if (effect.type === "advance_phase") {
    return { ...facts, phases: new Set([...facts.phases, effect.to]) };
  }

  return facts;
}

function addFlagFact(facts: FlowFacts, flag: string, value: boolean): FlowFacts {
  return value
    ? { ...facts, trueFlags: new Set([...facts.trueFlags, flag]) }
    : { ...facts, falseFlags: new Set([...facts.falseFlags, flag]) };
}

function diagnoseCondition(
  condition: Condition,
  facts: FlowFacts,
  path: string,
): PackageFlowDiagnostic[] {
  const missingFact = readMissingFact(condition, facts);

  if (!missingFact) {
    return [];
  }

  return [
    {
      severity: "warning",
      code: "unsatisfied_scene_entry",
      path,
      message: `Scene entry condition cannot be satisfied by previous scene effects: ${missingFact}`,
    },
  ];
}

function isSceneUnreachable(conditions: readonly Condition[], facts: FlowFacts): boolean {
  return conditions.some((condition) => Boolean(readMissingFact(condition, facts)));
}

function readMissingFact(condition: Condition, facts: FlowFacts): string | undefined {
  if (condition.op === "flag_true" && !facts.trueFlags.has(condition.flag)) {
    return condition.flag;
  }

  if (condition.op === "flag_false" && !facts.falseFlags.has(condition.flag)) {
    return condition.flag;
  }

  if (condition.op === "clue_revealed" && !facts.revealedClues.has(condition.clue_code)) {
    return condition.clue_code;
  }

  if (condition.op === "phase_eq" && !facts.phases.has(condition.phase)) {
    return condition.phase;
  }

  return undefined;
}

function hasTruthMetadata(scriptPackage: ScriptPackage): boolean {
  const meta = scriptPackage.meta as { readonly truth?: unknown } | undefined;

  return meta?.truth !== undefined;
}

import { applyAction, evaluateConditions, getAvailableActions, type RuntimeState } from "./runtime.js";
import type { Condition, Effect, Scene, ScenePhase } from "./schema.js";
import type { ScriptPackage } from "./package-schema.js";

const INITIAL_COUNTER_VALUE = 0;
const INITIAL_FLAG_VALUE = false;

export type PackageSimulationDiagnosticCode = "deadlock_scene";

export interface PackageSimulationDiagnostic {
  readonly severity: "warning";
  readonly code: PackageSimulationDiagnosticCode;
  readonly path: string;
  readonly message: string;
}

export interface AppliedSimulationAction {
  readonly sceneCode: string;
  readonly actionCode: string;
}

export interface PackageSimulationResult {
  readonly visitedScenes: readonly string[];
  readonly appliedActions: readonly AppliedSimulationAction[];
  readonly diagnostics: readonly PackageSimulationDiagnostic[];
}

interface InternalPackageSimulationResult extends PackageSimulationResult {
  readonly state: RuntimeState;
}

interface SceneSimulationResult {
  readonly state: RuntimeState;
  readonly appliedActions: readonly AppliedSimulationAction[];
  readonly diagnostics: readonly PackageSimulationDiagnostic[];
}

interface ScoreSeeds {
  readonly team: Readonly<Record<string, number>>;
  readonly role: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly seat: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

export function simulateScriptPackage(scriptPackage: ScriptPackage): PackageSimulationResult {
  const result = scriptPackage.scenes.reduce<InternalPackageSimulationResult>(
    (current, scene) => simulateReachableScene(scene, current),
    createInitialSimulationResult(scriptPackage),
  );

  return omitSimulationState(result);
}

function createInitialSimulationResult(scriptPackage: ScriptPackage): InternalPackageSimulationResult {
  return {
    visitedScenes: [],
    appliedActions: [],
    diagnostics: [],
    state: createInitialState(scriptPackage),
  };
}

function simulateReachableScene(
  scene: Scene,
  result: InternalPackageSimulationResult,
): InternalPackageSimulationResult {
  if (!evaluateConditions(scene.entry_if, result.state)) {
    return result;
  }

  const sceneResult = simulateSceneActions(scene, { ...result.state, phase: scene.phase });

  return {
    state: sceneResult.state,
    visitedScenes: [...result.visitedScenes, scene.scene_code],
    appliedActions: [...result.appliedActions, ...sceneResult.appliedActions],
    diagnostics: [...result.diagnostics, ...sceneResult.diagnostics],
  };
}

function omitSimulationState(result: InternalPackageSimulationResult): PackageSimulationResult {
  return {
    visitedScenes: result.visitedScenes,
    appliedActions: result.appliedActions,
    diagnostics: result.diagnostics,
  };
}

function simulateSceneActions(scene: Scene, state: RuntimeState): SceneSimulationResult {
  const initialResult: SceneSimulationResult = { state, appliedActions: [], diagnostics: [] };
  const result = scene.actions.reduce(simulateActionIfUseful(scene), initialResult);

  return appendDeadlockDiagnostic(scene, result);
}

function simulateActionIfUseful(scene: Scene) {
  return (result: SceneSimulationResult, action: Scene["actions"][number]): SceneSimulationResult => {
    if (evaluateConditions(scene.end_if, result.state)) {
      return result;
    }

    if (!getAvailableActions(scene, result.state).some((available) => available.code === action.code)) {
      return result;
    }

    return applySimulationAction(scene.scene_code, action, result);
  };
}

function applySimulationAction(
  sceneCode: string,
  action: Scene["actions"][number],
  result: SceneSimulationResult,
): SceneSimulationResult {
  return {
    state: applyAction(action, result.state),
    appliedActions: [...result.appliedActions, { sceneCode, actionCode: action.code }],
    diagnostics: result.diagnostics,
  };
}

function appendDeadlockDiagnostic(
  scene: Scene,
  result: SceneSimulationResult,
): SceneSimulationResult {
  if (evaluateConditions(scene.end_if, result.state)) {
    return result;
  }

  if (getAvailableActions(scene, result.state).length > 0) {
    return result;
  }

  return { ...result, diagnostics: [...result.diagnostics, createDeadlockDiagnostic(scene)] };
}

function createDeadlockDiagnostic(scene: Scene): PackageSimulationDiagnostic {
  return {
    severity: "warning",
    code: "deadlock_scene",
    path: `scenes.${scene.scene_code}`,
    message: `Scene cannot end and has no available actions: ${scene.scene_code}`,
  };
}

function createInitialState(scriptPackage: ScriptPackage): RuntimeState {
  return {
    flags: createInitialFlags(scriptPackage),
    inventory: [],
    revealedClues: readInitiallyVisibleClues(scriptPackage),
    timerExpired: false,
    phase: readInitialPhase(scriptPackage.scenes),
    counters: createInitialCounters(scriptPackage),
    seatCount: scriptPackage.meta?.player_count ?? scriptPackage.roles.length,
    npcEvents: [],
    messages: [],
    scores: createInitialScores(scriptPackage),
  };
}

function readInitialPhase(scenes: readonly Scene[]): ScenePhase {
  const scene = scenes[0];

  if (!scene) {
    throw new Error("ScriptPackage has no scenes to simulate");
  }

  return scene.phase;
}

function createInitialFlags(scriptPackage: ScriptPackage): Record<string, boolean> {
  return Object.fromEntries(readFlagNames(scriptPackage).map((flag) => [flag, INITIAL_FLAG_VALUE]));
}

function createInitialCounters(scriptPackage: ScriptPackage): Record<string, number> {
  return Object.fromEntries(readCounterNames(scriptPackage).map((name) => [name, INITIAL_COUNTER_VALUE]));
}

function readInitiallyVisibleClues(scriptPackage: ScriptPackage): readonly string[] {
  return scriptPackage.clues
    .filter((clue) => clue.initial_visibility.some((scope) => scope.kind === "public"))
    .map((clue) => clue.clue_code);
}

function readFlagNames(scriptPackage: ScriptPackage): readonly string[] {
  return unique([
    ...readAllConditions(scriptPackage).flatMap(readConditionFlagNames),
    ...readAllEffects(scriptPackage).flatMap(readEffectFlagNames),
  ]);
}

function readCounterNames(scriptPackage: ScriptPackage): readonly string[] {
  return unique(readAllConditions(scriptPackage).flatMap(readConditionCounterNames));
}

function readAllConditions(scriptPackage: ScriptPackage): readonly Condition[] {
  return scriptPackage.scenes.flatMap((scene) => [
    ...scene.entry_if,
    ...scene.end_if,
    ...scene.actions.flatMap((action) => action.allow_if),
  ]);
}

function readAllEffects(scriptPackage: ScriptPackage): readonly Effect[] {
  return scriptPackage.scenes.flatMap((scene) =>
    scene.actions.flatMap((action) => action.effect),
  );
}

function readConditionFlagNames(condition: Condition): readonly string[] {
  if (condition.op === "flag_true" || condition.op === "flag_false") {
    return [condition.flag];
  }

  return [];
}

function readConditionCounterNames(condition: Condition): readonly string[] {
  return condition.op === "counter_gte" ? [condition.counter] : [];
}

function readEffectFlagNames(effect: Effect): readonly string[] {
  return effect.type === "set_flag" ? [effect.flag] : [];
}

function createInitialScores(scriptPackage: ScriptPackage): RuntimeState["scores"] {
  const seeds = readAllEffects(scriptPackage).reduce(addScoreSeed, createEmptyScoreSeeds());

  return { team: seeds.team, role: seeds.role, seat: seeds.seat };
}

function createEmptyScoreSeeds(): ScoreSeeds {
  return { team: {}, role: {}, seat: {} };
}

function addScoreSeed(seeds: ScoreSeeds, effect: Effect): ScoreSeeds {
  if (effect.type !== "score_delta") {
    return seeds;
  }

  if (effect.target === "team") {
    return { ...seeds, team: { ...seeds.team, [effect.key]: INITIAL_COUNTER_VALUE } };
  }

  return addTargetedScoreSeed(seeds, effect.target, effect.target_value, effect.key);
}

function addTargetedScoreSeed(
  seeds: ScoreSeeds,
  target: "role" | "seat",
  targetValue: string | undefined,
  key: string,
): ScoreSeeds {
  if (!targetValue) {
    return seeds;
  }

  const bucket = seeds[target][targetValue] ?? {};
  return { ...seeds, [target]: { ...seeds[target], [targetValue]: { ...bucket, [key]: 0 } } };
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

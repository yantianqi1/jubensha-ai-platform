import type { Action, Condition, Effect, Scene, ScenePhase, ScopeRef } from "./schema.js";

export interface RuntimeScores {
  readonly team: Readonly<Record<string, number>>;
  readonly role: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly seat: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

export interface RuntimeNpcEvent {
  readonly npcCode: string;
  readonly event: string;
}

export interface RuntimeMessage {
  readonly toScope: ScopeRef;
  readonly messageCode: string;
}

export interface RuntimeState {
  readonly flags: Readonly<Record<string, boolean>>;
  readonly inventory: readonly string[];
  readonly revealedClues: readonly string[];
  readonly timerExpired: boolean;
  readonly phase: ScenePhase;
  readonly counters: Readonly<Record<string, number>>;
  readonly seatCount: number;
  readonly npcEvents: readonly RuntimeNpcEvent[];
  readonly messages: readonly RuntimeMessage[];
  readonly scores: RuntimeScores;
}

export function evaluateCondition(condition: Condition, state: RuntimeState): boolean {
  switch (condition.op) {
    case "flag_true":
      return requireFlagValue(state, condition.flag) === true;
    case "flag_false":
      return requireFlagValue(state, condition.flag) === false;
    case "inventory_has":
      return state.inventory.includes(condition.item);
    case "clue_revealed":
      return state.revealedClues.includes(condition.clue_code);
    case "all_clues_revealed":
      return condition.clue_codes.every((clueCode) => state.revealedClues.includes(clueCode));
    case "timer_expired":
      return state.timerExpired;
    case "phase_eq":
      return state.phase === condition.phase;
    case "counter_gte":
      return requireCounterValue(state, condition.counter) >= condition.value;
    case "seat_count_gte":
      return state.seatCount >= condition.value;
    default:
      return assertNever(condition);
  }
}

export function evaluateConditions(
  conditions: readonly Condition[],
  state: RuntimeState,
): boolean {
  return conditions.every((condition) => evaluateCondition(condition, state));
}

export function isActionAvailable(action: Action, state: RuntimeState): boolean {
  return evaluateConditions(action.allow_if, state);
}

export function findSceneAction(scene: Scene, actionCode: string): Action {
  const action = scene.actions.find((candidate) => candidate.code === actionCode);

  if (!action) {
    throw new Error(`Unknown action: ${actionCode}`);
  }

  return action;
}

export function getAvailableActions(scene: Scene, state: RuntimeState): Action[] {
  return scene.actions.filter((action) => isActionAvailable(action, state));
}

export function applyEffect(effect: Effect, state: RuntimeState): RuntimeState {
  switch (effect.type) {
    case "reveal_clue":
      return { ...state, revealedClues: addUnique(state.revealedClues, effect.clue_code) };
    case "set_flag":
      requireFlagValue(state, effect.flag);
      return { ...state, flags: { ...state.flags, [effect.flag]: effect.value } };
    case "grant_item":
      return { ...state, inventory: addUnique(state.inventory, effect.item) };
    case "advance_phase":
      return { ...state, phase: effect.to };
    case "npc_event":
      return {
        ...state,
        npcEvents: [...state.npcEvents, { npcCode: effect.npc_code, event: effect.event }],
      };
    case "score_delta":
      return { ...state, scores: applyScoreDelta(effect, state.scores) };
    case "broadcast_message":
      return {
        ...state,
        messages: [...state.messages, { toScope: effect.to_scope, messageCode: effect.message_code }],
      };
    default:
      return assertNever(effect);
  }
}

export function applyEffects(effects: readonly Effect[], state: RuntimeState): RuntimeState {
  return effects.reduce((nextState, effect) => applyEffect(effect, nextState), state);
}

export function applyAction(action: Action, state: RuntimeState): RuntimeState {
  if (!isActionAvailable(action, state)) {
    throw new Error(`Action is not available: ${action.code}`);
  }

  return applyEffects(action.effect, state);
}

export function applySceneAction(
  scene: Scene,
  actionCode: string,
  state: RuntimeState,
): RuntimeState {
  return applyAction(findSceneAction(scene, actionCode), state);
}

function requireFlagValue(state: RuntimeState, flag: string): boolean {
  const value = state.flags[flag];

  if (value === undefined) {
    throw new Error(`Unknown flag: ${flag}`);
  }

  return value;
}

function requireCounterValue(state: RuntimeState, counter: string): number {
  const value = state.counters[counter];

  if (value === undefined) {
    throw new Error(`Unknown counter: ${counter}`);
  }

  return value;
}

function applyScoreDelta(
  effect: Extract<Effect, { type: "score_delta" }>,
  scores: RuntimeScores,
): RuntimeScores {
  if (effect.target === "team") {
    return { ...scores, team: updateKnownScore(scores.team, effect.key, effect.delta) };
  }

  const targetValue = requireScoreTargetValue(effect);
  const targetScores = scores[effect.target][targetValue];

  if (!targetScores) {
    throw new Error(`Unknown score target: ${effect.target}:${targetValue}`);
  }

  return {
    ...scores,
    [effect.target]: {
      ...scores[effect.target],
      [targetValue]: updateKnownScore(targetScores, effect.key, effect.delta),
    },
  };
}

function updateKnownScore(
  scores: Readonly<Record<string, number>>,
  key: string,
  delta: number,
): Record<string, number> {
  const current = scores[key];

  if (current === undefined) {
    throw new Error(`Unknown score: ${key}`);
  }

  return { ...scores, [key]: current + delta };
}

function requireScoreTargetValue(effect: Extract<Effect, { type: "score_delta" }>): string {
  if (!effect.target_value) {
    throw new Error(`Missing score target value for ${effect.target}`);
  }

  return effect.target_value;
}

function addUnique(values: readonly string[], value: string): readonly string[] {
  if (values.includes(value)) {
    return values;
  }

  return [...values, value];
}

function assertNever(value: never): never {
  throw new Error(`Unsupported condition: ${JSON.stringify(value)}`);
}

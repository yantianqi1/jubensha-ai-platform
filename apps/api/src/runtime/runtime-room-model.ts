import {
  applySceneAction,
  type RuntimeState,
  type Scene,
} from "@jubensha/dsl";
import type { ScriptVersionRecord } from "../content/content-repository.js";
import { RuntimeRuleError } from "./runtime-errors.js";
import type {
  RuntimeEventRecord,
  RuntimeRoomRecord,
  RuntimeSeatRecord,
} from "./runtime-repository.js";
export interface BuildInitialRoomInput {
  readonly input: { readonly versionId: string; readonly seatCount: number };
  readonly version: ScriptVersionRecord;
  readonly scene: Scene;
  readonly seats: readonly RuntimeSeatRecord[];
  readonly id: string;
}

interface ReplayEventsInput {
  readonly version: ScriptVersionRecord;
  readonly events: readonly RuntimeEventRecord[];
  readonly initialState: RuntimeState;
}

export function buildInitialRoom(options: BuildInitialRoomInput): RuntimeRoomRecord {
  return {
    id: options.id,
    versionId: options.version.id,
    packageCode: options.version.content.package_code,
    currentSceneCode: options.scene.scene_code,
    state: createInitialState(options.scene, options.input.seatCount),
    events: [],
    seats: options.seats,
    revision: 0,
  };
}

export function createSeats(
  version: ScriptVersionRecord,
  seatCount: number,
): readonly RuntimeSeatRecord[] {
  if (seatCount > version.content.roles.length) {
    throw new RuntimeRuleError("seatCount cannot exceed package role count");
  }

  return version.content.roles.slice(0, seatCount).map((role, index) => ({
    seatId: `seat_${index + 1}`,
    roleCode: role.role_code,
    playerId: null,
    connected: false,
    lastSeenAt: null,
  }));
}

export function readInitialScene(version: ScriptVersionRecord): Scene {
  const scene = version.content.scenes[0];

  if (!scene) {
    throw new RuntimeRuleError(`Released version has no scenes: ${version.id}`);
  }

  return scene;
}

export function createInitialState(scene: Scene, seatCount: number): RuntimeState {
  return {
    flags: {},
    inventory: [],
    revealedClues: [],
    timerExpired: false,
    phase: scene.phase,
    counters: {},
    seatCount,
    npcEvents: [],
    messages: [],
    scores: { team: {}, role: {}, seat: {} },
  };
}

export function findCurrentScene(version: ScriptVersionRecord, sceneCode: string): Scene {
  const scene = version.content.scenes.find((candidate) => candidate.scene_code === sceneCode);

  if (!scene) {
    throw new RuntimeRuleError(`Runtime scene not found: ${sceneCode}`);
  }

  return scene;
}

export function applyActionOrThrow(
  scene: Scene,
  actionCode: string,
  state: RuntimeState,
): RuntimeState {
  try {
    return applySceneAction(scene, actionCode, state);
  } catch (error) {
    throw new RuntimeRuleError(readErrorMessage(error));
  }
}

export function buildActionRoom(
  room: RuntimeRoomRecord,
  scene: Scene,
  actionCode: string,
  state: RuntimeState,
): RuntimeRoomRecord {
  return {
    ...room,
    state,
    currentSceneCode: scene.scene_code,
    revision: room.revision + 1,
    events: [...room.events, { type: "action_applied", actionCode, sceneCode: scene.scene_code }],
  };
}

export function replayEvents(input: ReplayEventsInput): RuntimeState {
  return input.events.reduce(
    (state, event) => replayEvent(input.version, event, state),
    input.initialState,
  );
}

function replayEvent(
  version: ScriptVersionRecord,
  event: RuntimeEventRecord,
  state: RuntimeState,
): RuntimeState {
  switch (event.type) {
    case "action_applied":
      return applyActionEvent(version, event, state);
  }
}

function applyActionEvent(
  version: ScriptVersionRecord,
  event: RuntimeEventRecord,
  state: RuntimeState,
): RuntimeState {
  const scene = findCurrentScene(version, event.sceneCode);
  return applyActionOrThrow(scene, event.actionCode, state);
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Runtime rule evaluation failed";
}

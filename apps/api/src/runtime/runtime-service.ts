import {
  applySceneAction,
  type RuntimeState,
  type Scene,
} from "@jubensha/dsl";
import type { ScriptVersionRecord } from "../content/content-repository.js";
import {
  RuntimeNotFoundError,
  RuntimeRuleError,
} from "./runtime-errors.js";
import type { RuntimeIdGenerator } from "./runtime-id-generator.js";
import type {
  RuntimeEventRecord,
  RuntimeRepository,
  RuntimeRoomRecord,
} from "./runtime-repository.js";

export interface RuntimeVersionReader {
  getReleasedVersion(versionId: string): Promise<ScriptVersionRecord>;
}

export interface RuntimeServiceOptions {
  readonly repository: RuntimeRepository;
  readonly idGenerator: RuntimeIdGenerator;
  readonly versionReader: RuntimeVersionReader;
}

export interface CreateRuntimeRoomInput {
  readonly versionId: string;
  readonly seatCount: number;
}

export class RuntimeService {
  private readonly repository: RuntimeRepository;
  private readonly idGenerator: RuntimeIdGenerator;
  private readonly versionReader: RuntimeVersionReader;

  constructor(options: RuntimeServiceOptions) {
    this.repository = options.repository;
    this.idGenerator = options.idGenerator;
    this.versionReader = options.versionReader;
  }

  async createRoom(input: CreateRuntimeRoomInput): Promise<RuntimeRoomRecord> {
    const version = await this.versionReader.getReleasedVersion(input.versionId);
    const scene = readInitialScene(version);
    const room: RuntimeRoomRecord = {
      id: this.idGenerator(),
      versionId: version.id,
      packageCode: version.content.package_code,
      currentSceneCode: scene.scene_code,
      state: createInitialState(scene, input.seatCount),
      events: [],
    };

    return this.repository.saveRoom(room);
  }

  async getRoom(roomId: string): Promise<RuntimeRoomRecord> {
    const room = await this.repository.findRoom(roomId);

    if (!room) {
      throw new RuntimeNotFoundError(`Runtime room not found: ${roomId}`);
    }

    return room;
  }

  async listRooms(): Promise<readonly RuntimeRoomRecord[]> {
    return this.repository.listRooms();
  }

  async applyRoomAction(roomId: string, actionCode: string): Promise<RuntimeRoomRecord> {
    const room = await this.getRoom(roomId);
    const version = await this.versionReader.getReleasedVersion(room.versionId);
    const scene = findCurrentScene(version, room.currentSceneCode);
    const nextState = applyActionOrThrow(scene, actionCode, room.state);

    return this.repository.saveRoom({
      ...room,
      state: nextState,
      currentSceneCode: scene.scene_code,
      events: [
        ...room.events,
        { type: "action_applied", actionCode, sceneCode: scene.scene_code },
      ],
    });
  }

  async replayRoom(roomId: string): Promise<RuntimeRoomRecord> {
    const room = await this.getRoom(roomId);
    const version = await this.versionReader.getReleasedVersion(room.versionId);
    const initialScene = readInitialScene(version);
    const state = replayEvents({
      version,
      events: room.events,
      initialState: createInitialState(initialScene, room.state.seatCount),
    });

    return this.repository.saveRoom({ ...room, state });
  }
}

interface ReplayEventsInput {
  readonly version: ScriptVersionRecord;
  readonly events: readonly RuntimeEventRecord[];
  readonly initialState: RuntimeState;
}

function readInitialScene(version: ScriptVersionRecord): Scene {
  const scene = version.content.scenes[0];

  if (!scene) {
    throw new RuntimeRuleError(`Released version has no scenes: ${version.id}`);
  }

  return scene;
}

function createInitialState(scene: Scene, seatCount: number): RuntimeState {
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

function findCurrentScene(version: ScriptVersionRecord, sceneCode: string): Scene {
  const scene = version.content.scenes.find((candidate) => candidate.scene_code === sceneCode);

  if (!scene) {
    throw new RuntimeRuleError(`Runtime scene not found: ${sceneCode}`);
  }

  return scene;
}

function applyActionOrThrow(
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

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Runtime rule evaluation failed";
}

function replayEvents(input: ReplayEventsInput): RuntimeState {
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

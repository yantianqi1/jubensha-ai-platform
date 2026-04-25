import { RuntimeConflictError, RuntimeNotFoundError, RuntimeRuleError } from "./runtime-errors.js";
import type { RuntimeIdGenerator } from "./runtime-id-generator.js";
import {
  applyActionOrThrow,
  buildActionRoom,
  buildInitialRoom,
  createInitialState,
  createSeats,
  findCurrentScene,
  readInitialScene,
  replayEvents,
} from "./runtime-room-model.js";
import type {
  RuntimeRepository,
  RuntimeRoomRecord,
  RuntimeSeatRecord,
} from "./runtime-repository.js";
import {
  projectAdminSnapshot,
  projectPublicSnapshot,
  projectSeatSnapshot,
  type RuntimeAdminSnapshot,
  type RuntimePublicSnapshot,
  type RuntimeSeatSnapshot,
} from "./runtime-snapshot.js";
import type { ScriptVersionRecord } from "../content/content-repository.js";

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

export interface JoinRuntimeSeatInput {
  readonly seatId: string;
  readonly playerId: string;
}

export interface ApplyRuntimeActionInput {
  readonly actionCode: string;
  readonly expectedRevision: number;
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
    const seats = createSeats(version, input.seatCount);
    const room = buildInitialRoom({ input, version, scene, seats, id: this.idGenerator() });

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

  async joinSeat(roomId: string, input: JoinRuntimeSeatInput): Promise<RuntimeRoomRecord> {
    const room = await this.getRoom(roomId);
    const seats = joinSeatOrThrow(room.seats, input);

    return this.repository.saveRoom({ ...room, seats, revision: room.revision + 1 });
  }

  async applyRoomAction(
    roomId: string,
    input: ApplyRuntimeActionInput,
  ): Promise<RuntimeRoomRecord> {
    const room = await this.getRoom(roomId);
    assertCurrentRevision(room, input.expectedRevision);
    const version = await this.versionReader.getReleasedVersion(room.versionId);
    const scene = findCurrentScene(version, room.currentSceneCode);
    const nextState = applyActionOrThrow(scene, input.actionCode, room.state);

    return this.repository.saveRoom(buildActionRoom(room, scene, input.actionCode, nextState));
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

  async getPublicSnapshot(roomId: string): Promise<RuntimePublicSnapshot> {
    const room = await this.getRoom(roomId);
    const version = await this.versionReader.getReleasedVersion(room.versionId);
    return projectPublicSnapshot(version.content, room);
  }

  async getSeatSnapshot(roomId: string, seatId: string): Promise<RuntimeSeatSnapshot> {
    const room = await this.getRoom(roomId);
    const seat = findSeatOrThrow(room.seats, seatId);
    const version = await this.versionReader.getReleasedVersion(room.versionId);
    return projectSeatSnapshot(version.content, room, seat);
  }

  async getAdminSnapshot(roomId: string): Promise<RuntimeAdminSnapshot> {
    const room = await this.getRoom(roomId);
    const version = await this.versionReader.getReleasedVersion(room.versionId);
    return projectAdminSnapshot(version.content, room);
  }
}

function joinSeatOrThrow(
  seats: readonly RuntimeSeatRecord[],
  input: JoinRuntimeSeatInput,
): readonly RuntimeSeatRecord[] {
  findSeatOrThrow(seats, input.seatId);
  assertPlayerCanJoin(seats, input);

  return seats.map((seat) => (seat.seatId === input.seatId ? joinedSeat(seat, input) : seat));
}

function assertPlayerCanJoin(
  seats: readonly RuntimeSeatRecord[],
  input: JoinRuntimeSeatInput,
): void {
  if (seats.some((seat) => seat.seatId === input.seatId && seat.playerId !== null)) {
    throw new RuntimeRuleError(`Runtime seat already joined: ${input.seatId}`);
  }

  if (seats.some((seat) => seat.playerId === input.playerId)) {
    throw new RuntimeRuleError(`Runtime player already joined: ${input.playerId}`);
  }
}

function joinedSeat(
  seat: RuntimeSeatRecord,
  input: JoinRuntimeSeatInput,
): RuntimeSeatRecord {
  return { ...seat, playerId: input.playerId, connected: true, lastSeenAt: new Date().toISOString() };
}

function findSeatOrThrow(
  seats: readonly RuntimeSeatRecord[],
  seatId: string,
): RuntimeSeatRecord {
  const seat = seats.find((candidate) => candidate.seatId === seatId);

  if (!seat) {
    throw new RuntimeNotFoundError(`Runtime seat not found: ${seatId}`);
  }

  return seat;
}

function assertCurrentRevision(room: RuntimeRoomRecord, expectedRevision: number): void {
  if (room.revision !== expectedRevision) {
    throw new RuntimeConflictError(
      `Runtime revision conflict: expected ${expectedRevision}, current ${room.revision}`,
    );
  }
}

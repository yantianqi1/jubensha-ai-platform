import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RuntimeRepository, RuntimeRoomRecord } from "./runtime-repository.js";
import { PostgresRuntimeRepository } from "./postgres-runtime-repository.js";
import { ensureRuntimeSchema } from "./postgres-runtime-schema.js";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

const roomRecord: RuntimeRoomRecord = {
  id: "room_test_1",
  versionId: "ver_test_1",
  packageCode: "fog_harbor",
  currentSceneCode: "act1",
  state: {
    flags: {},
    inventory: [],
    revealedClues: [],
    timerExpired: false,
    phase: "investigation",
    counters: {},
    seatCount: 3,
    npcEvents: [],
    messages: [],
    scores: { team: {}, role: {}, seat: {} },
  },
  events: [],
  seats: [
    { seatId: "seat_1", roleCode: "detective", playerId: null, connected: false, lastSeenAt: null },
  ],
  revision: 0,
};

describeDatabase("PostgresRuntimeRepository", () => {
  let pool: Pool;
  let repository: RuntimeRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await ensureRuntimeSchema(pool);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE runtime_rooms");
    repository = new PostgresRuntimeRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("saves and loads a runtime room", async () => {
    await repository.saveRoom(roomRecord);

    await expect(repository.findRoom(roomRecord.id)).resolves.toEqual(roomRecord);
  });

  it("lists runtime rooms in creation order", async () => {
    const second: RuntimeRoomRecord = { ...roomRecord, id: "room_test_2" };

    await repository.saveRoom(roomRecord);
    await repository.saveRoom(second);

    await expect(repository.listRooms()).resolves.toEqual([roomRecord, second]);
  });

  it("updates room state and event history", async () => {
    const updated: RuntimeRoomRecord = {
      ...roomRecord,
      state: { ...roomRecord.state, revealedClues: ["C-01"] },
      events: [{ type: "action_applied", actionCode: "inspect_window", sceneCode: "act1" }],
      revision: 1,
    };

    await repository.saveRoom(roomRecord);
    await repository.saveRoom(updated);

    await expect(repository.findRoom(roomRecord.id)).resolves.toEqual(updated);
  });

  it("returns null for a missing room", async () => {
    await expect(repository.findRoom("room_missing")).resolves.toBeNull();
  });
});

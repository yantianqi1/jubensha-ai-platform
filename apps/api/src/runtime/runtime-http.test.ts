import {
  HttpStatus,
  RequestMethod,
  UnauthorizedException,
  type ArgumentsHost,
} from "@nestjs/common";
import {
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { lastValueFrom, toArray } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit-service.js";
import { InMemoryAuditRepository } from "../audit/audit-repository.js";
import type { ScriptVersionRecord } from "../content/content-repository.js";
import { InMemoryRuntimeRepository } from "./in-memory-runtime-repository.js";
import { RuntimeRuleError } from "./runtime-errors.js";
import { RuntimeHttpErrorFilter } from "./runtime-http-error.filter.js";
import { RuntimeController } from "./runtime.controller.js";
import type { RuntimeRepository } from "./runtime-repository.js";
import { RuntimeService, type RuntimeVersionReader } from "./runtime-service.js";
import {
  RUNTIME_ID_GENERATOR,
  RUNTIME_REPOSITORY,
  RUNTIME_VERSION_READER,
} from "./runtime.tokens.js";

const ROOT_PATH = "runtime";
const ROOM_PATH = "rooms";
const ROOM_DETAIL_PATH = "rooms/:roomId";
const ROOM_ACTION_PATH = "rooms/:roomId/actions";
const ROOM_REPLAY_PATH = "rooms/:roomId/replay";
const ROOM_EVENTS_PATH = "rooms/:roomId/events";
const ROOM_JOIN_PATH = "rooms/:roomId/seats/:seatId/join";
const ROOM_PUBLIC_SNAPSHOT_PATH = "rooms/:roomId/snapshot";
const ROOM_SEAT_SNAPSHOT_PATH = "rooms/:roomId/seats/:seatId/snapshot";
const ROOM_ADMIN_SNAPSHOT_PATH = "rooms/:roomId/admin-snapshot";

const releasedVersion: ScriptVersionRecord = {
  id: "ver_1",
  semver: "1.0.0",
  state: "released",
  content: {
    package_code: "fog_harbor",
    title: "雾港失踪案",
    status: "released",
    semver: "1.0.0",
    roles: [
      {
        role_code: "detective",
        name: "侦探",
        public_profile: "受邀调查雾港宅邸失踪案。",
        private_secret: "知道港口账本藏在窗台夹层。",
      },
      {
        role_code: "doctor",
        name: "医生",
        public_profile: "曾为失踪者做过诊疗。",
      },
      {
        role_code: "butler",
        name: "管家",
        public_profile: "管理雾港宅邸多年。",
      },
    ],
    clues: [
      {
        clue_code: "C-01",
        title: "窗台划痕",
        content: "窗台上有一道新鲜划痕。",
        initial_visibility: [{ kind: "public", value: "all" }],
        unlock_if: [],
      },
      {
        clue_code: "C-02",
        title: "私藏账本",
        content: "账本记录了秘密付款。",
        initial_visibility: [{ kind: "role", value: "detective" }],
        unlock_if: [],
      },
    ],
    scenes: [
      {
        scene_code: "act1",
        phase: "investigation",
        visible_to: [{ kind: "public", value: "all" }],
        actions: [
          {
            code: "inspect_window",
            allow_if: [],
            effect: [{ type: "reveal_clue", clue_code: "C-01" }],
          },
        ],
        end_if: [{ op: "timer_expired" }],
        entry_if: [],
        win_rule_hooks: [],
      },
    ],
  },
};

describe("Runtime HTTP entrypoints", () => {
  let controller: RuntimeController;
  let auditService: AuditService;

  beforeEach(async () => {
    auditService = createAuditService();
    const moduleRef = await Test.createTestingModule({
      controllers: [RuntimeController],
      providers: [
        { provide: RUNTIME_REPOSITORY, useFactory: () => new InMemoryRuntimeRepository() },
        { provide: RUNTIME_ID_GENERATOR, useValue: () => "room_1" },
        {
          provide: RUNTIME_VERSION_READER,
          useValue: { getReleasedVersion: async () => releasedVersion },
        },
        {
          provide: RuntimeService,
          inject: [RUNTIME_REPOSITORY, RUNTIME_ID_GENERATOR, RUNTIME_VERSION_READER],
          useFactory: (
            repository: RuntimeRepository,
            idGenerator: () => string,
            versionReader: RuntimeVersionReader,
          ) => new RuntimeService({ repository, idGenerator, versionReader }),
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    controller = moduleRef.get(RuntimeController);
  });

  it("exposes REST route metadata", () => {
    expect(Reflect.getMetadata(PATH_METADATA, RuntimeController)).toBe(ROOT_PATH);
    expectRoute("createRoom", ROOM_PATH, RequestMethod.POST);
    expectRoute("listRooms", ROOM_PATH, RequestMethod.GET);
    expectRoute("getRoom", ROOM_DETAIL_PATH, RequestMethod.GET);
    expectRoute("joinSeat", ROOM_JOIN_PATH, RequestMethod.POST);
    expectRoute("getPublicSnapshot", ROOM_PUBLIC_SNAPSHOT_PATH, RequestMethod.GET);
    expectRoute("getSeatSnapshot", ROOM_SEAT_SNAPSHOT_PATH, RequestMethod.GET);
    expectRoute("getAdminSnapshot", ROOM_ADMIN_SNAPSHOT_PATH, RequestMethod.GET);
    expectRoute("applyRoomAction", ROOM_ACTION_PATH, RequestMethod.POST);
    expectRoute("replayRoom", ROOM_REPLAY_PATH, RequestMethod.POST);
    expectRoute("streamRoomEvents", ROOM_EVENTS_PATH, RequestMethod.GET);
  });

  it("creates and retrieves a runtime room", async () => {
    const created = await controller.createRoom({ versionId: "ver_1", seatCount: 3 });

    expect(created.id).toBe("room_1");
    expect(created.currentSceneCode).toBe("act1");
    await expect(controller.getRoom("room_1")).resolves.toEqual(created);
  });

  it("lists runtime rooms", async () => {
    const created = await controller.createRoom({ versionId: "ver_1", seatCount: 3 });

    await expect(controller.listRooms()).resolves.toEqual([created]);
  });


  it("joins seats and exposes scoped snapshots", async () => {
    await controller.createRoom({ versionId: "ver_1", seatCount: 3 });

    const joined = await controller.joinSeat("room_1", "seat_1", { playerId: "player_a" }, { "x-player-id": "player_a" });
    const publicSnapshot = await controller.getPublicSnapshot("room_1");
    const seatSnapshot = await controller.getSeatSnapshot("room_1", "seat_1");
    const adminSnapshot = await controller.getAdminSnapshot("room_1");

    expect(joined.revision).toBe(1);
    expect(publicSnapshot.visibleClues.map((clue) => clue.clueCode)).toEqual(["C-01"]);
    expect(JSON.stringify(publicSnapshot)).not.toContain("账本藏在窗台");
    expect(seatSnapshot.privateRole.privateSecret).toBe("知道港口账本藏在窗台夹层。");
    expect(seatSnapshot.visibleClues.map((clue) => clue.clueCode)).toEqual(["C-01", "C-02"]);
    expect(adminSnapshot.seats[0].playerId).toBe("player_a");
    await expect(auditService.listEvents({ targetType: "runtime_room", targetId: "room_1" })).resolves.toEqual([
      expect.objectContaining({ action: "join_seat", status: "succeeded" }),
    ]);
  });

  it("applies a room action", async () => {
    await controller.createRoom({ versionId: "ver_1", seatCount: 3 });

    const room = await controller.applyRoomAction("room_1", { actionCode: "inspect_window", expectedRevision: 0 }, { "x-player-id": "player_a" });

    expect(room.state.revealedClues).toEqual(["C-01"]);
    expect(room.events).toHaveLength(1);
    await expect(auditService.listEvents({ targetType: "runtime_room", targetId: "room_1" })).resolves.toEqual([
      expect.objectContaining({ action: "apply_room_action", status: "succeeded" }),
    ]);
  });

  it("streams runtime events after a cursor", async () => {
    await controller.createRoom({ versionId: "ver_1", seatCount: 3 });
    await controller.applyRoomAction("room_1", { actionCode: "inspect_window", expectedRevision: 0 }, { "x-player-id": "player_a" });

    const stream = await controller.streamRoomEvents("room_1", "room_1:0");
    const messages = await lastValueFrom(stream.pipe(toArray()));

    expect(messages).toEqual([
      {
        data: {
          eventId: "room_1:1",
          roomId: "room_1",
          revision: 1,
          type: "action_applied",
          scope: "public",
          payload: { actionCode: "inspect_window", sceneCode: "act1" },
        },
        id: "room_1:1",
        type: "action_applied",
      },
    ]);
  });

  it("replays a runtime room", async () => {
    await controller.createRoom({ versionId: "ver_1", seatCount: 3 });
    await controller.applyRoomAction("room_1", { actionCode: "inspect_window", expectedRevision: 0 }, { "x-player-id": "player_a" });

    const room = await controller.replayRoom("room_1");

    expect(room.state.revealedClues).toEqual(["C-01"]);
    expect(room.events).toHaveLength(1);
  });

  it("maps runtime rule errors to conflict responses", () => {
    const response = createJsonResponse();
    const host = createArgumentsHost(response);

    new RuntimeHttpErrorFilter().catch(new RuntimeRuleError("Action blocked"), host);

    expect(response.statusCode).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({
      error: "RuntimeRuleError",
      message: "Action blocked",
    });
  });

  it("requires player identity for room mutations", async () => {
    await controller.createRoom({ versionId: "ver_1", seatCount: 3 });

    await expect(controller.joinSeat("room_1", "seat_1", { playerId: "player_a" }, {})).rejects.toThrow(UnauthorizedException);
  });
});

function expectRoute(
  methodName: keyof RuntimeController,
  path: string,
  requestMethod: RequestMethod,
): void {
  const handler = RuntimeController.prototype[methodName];

  expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
  expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(requestMethod);
}

function createJsonResponse() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    json(body: unknown) {
      this.body = body;
    },
  };
}

function createArgumentsHost(response: ReturnType<typeof createJsonResponse>): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}

function createAuditService(): AuditService {
  return new AuditService({
    repository: new InMemoryAuditRepository(),
    idGenerator: () => "audit_1",
    now: () => "2026-04-25T00:00:00.000Z",
  });
}

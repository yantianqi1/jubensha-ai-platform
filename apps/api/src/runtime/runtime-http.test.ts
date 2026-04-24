import {
  HttpStatus,
  RequestMethod,
  type ArgumentsHost,
} from "@nestjs/common";
import {
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
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

  beforeEach(async () => {
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
      ],
    }).compile();

    controller = moduleRef.get(RuntimeController);
  });

  it("exposes REST route metadata", () => {
    expect(Reflect.getMetadata(PATH_METADATA, RuntimeController)).toBe(ROOT_PATH);
    expectRoute("createRoom", ROOM_PATH, RequestMethod.POST);
    expectRoute("listRooms", ROOM_PATH, RequestMethod.GET);
    expectRoute("getRoom", ROOM_DETAIL_PATH, RequestMethod.GET);
    expectRoute("applyRoomAction", ROOM_ACTION_PATH, RequestMethod.POST);
    expectRoute("replayRoom", ROOM_REPLAY_PATH, RequestMethod.POST);
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

  it("applies a room action", async () => {
    await controller.createRoom({ versionId: "ver_1", seatCount: 3 });

    const room = await controller.applyRoomAction("room_1", { actionCode: "inspect_window" });

    expect(room.state.revealedClues).toEqual(["C-01"]);
    expect(room.events).toHaveLength(1);
  });

  it("replays a runtime room", async () => {
    await controller.createRoom({ versionId: "ver_1", seatCount: 3 });
    await controller.applyRoomAction("room_1", { actionCode: "inspect_window" });

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

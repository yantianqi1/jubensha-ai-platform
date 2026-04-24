import {
  BadRequestException,
  HttpStatus,
  RequestMethod,
  type ArgumentsHost,
} from "@nestjs/common";
import {
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { beforeEach, describe, expect, it } from "vitest";
import { RuntimeNotFoundError } from "../runtime/runtime-errors.js";
import { GenerationValidationError } from "./generation-errors.js";
import { GenerationController } from "./generation.controller.js";
import { GenerationHttpErrorFilter } from "./generation-http-error.filter.js";
import { GenerationService, type AskNpcInput } from "./generation-service.js";

const ROOT_PATH = "generation";
const ASK_NPC_PATH = "rooms/:roomId/npc/:npcCode/ask";

describe("Generation HTTP entrypoints", () => {
  let service: CapturingGenerationService;
  let controller: GenerationController;

  beforeEach(() => {
    service = new CapturingGenerationService();
    controller = new GenerationController(service as unknown as GenerationService);
  });

  it("exposes REST route metadata", () => {
    expect(Reflect.getMetadata(PATH_METADATA, GenerationController)).toBe(ROOT_PATH);
    expectRoute("askNpc", ASK_NPC_PATH, RequestMethod.POST);
  });

  it("asks an NPC and returns speech with proposals", async () => {
    const response = await controller.askNpc("room_1", "butler", {
      message: "你昨晚在哪里？",
    });

    expect(service.lastInput).toEqual({
      roomId: "room_1",
      npcCode: "butler",
      message: "你昨晚在哪里？",
    });
    expect(response).toEqual({ speech: "我在厨房。", confidence: 0.8, proposals: [] });
  });

  it("rejects invalid request bodies", () => {
    expect(() => controller.askNpc("room_1", "butler", {})).toThrow(BadRequestException);
  });

  it("maps generation validation errors to unprocessable entity responses", () => {
    const response = createJsonResponse();
    const host = createArgumentsHost(response);

    new GenerationHttpErrorFilter().catch(
      new GenerationValidationError("Invalid NPC response"),
      host,
    );

    expect(response.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(response.body).toEqual({
      error: "GenerationValidationError",
      message: "Invalid NPC response",
    });
  });

  it("maps unknown rooms to not found responses", () => {
    const response = createJsonResponse();
    const host = createArgumentsHost(response);

    new GenerationHttpErrorFilter().catch(
      new RuntimeNotFoundError("Runtime room not found: missing"),
      host,
    );

    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({
      error: "RuntimeNotFoundError",
      message: "Runtime room not found: missing",
    });
  });
});

class CapturingGenerationService {
  lastInput: AskNpcInput | undefined;

  async askNpc(input: AskNpcInput) {
    this.lastInput = input;
    return { speech: "我在厨房。", confidence: 0.8, proposals: [] };
  }
}

function expectRoute(
  methodName: keyof GenerationController,
  path: string,
  requestMethod: RequestMethod,
): void {
  const handler = GenerationController.prototype[methodName];

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

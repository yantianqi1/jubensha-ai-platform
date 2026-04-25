import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { HttpException, HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { firstValueFrom, of, throwError } from "rxjs";
import { RequestLoggingInterceptor } from "./request-logging.interceptor.js";

describe("RequestLoggingInterceptor", () => {
  it("logs method path and response status after successful requests", async () => {
    const logger = createLogger();
    const response = createResponse(201);
    const interceptor = new RequestLoggingInterceptor(logger);

    await firstValueFrom(
      interceptor.intercept(
        createContext({ method: "POST", path: "/creation/theme-assets/jobs", response }),
        createHandler(of({ ok: true })),
      ),
    );

    expect(logger.log).toHaveBeenCalledWith({
      method: "POST",
      path: "/creation/theme-assets/jobs",
      status: 201,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs method path status and error code without swallowing exceptions", async () => {
    const logger = createLogger();
    const response = createResponse(200);
    const interceptor = new RequestLoggingInterceptor(logger);
    const failure = new HttpException(
      { code: "QUALITY_GATE_FAILED" },
      HttpStatus.CONFLICT,
    );

    await expect(
      firstValueFrom(
        interceptor.intercept(
          createContext({ method: "PATCH", path: "/content/drafts/draft_1/publish", response }),
          createHandler(throwError(() => failure)),
        ),
      ),
    ).rejects.toBe(failure);

    expect(logger.error).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/content/drafts/draft_1/publish",
      status: 409,
      errorCode: "QUALITY_GATE_FAILED",
    });
    expect(logger.log).not.toHaveBeenCalled();
  });

  it("logs explicit operator and player identity headers when present", async () => {
    const logger = createLogger();
    const response = createResponse(200);
    const interceptor = new RequestLoggingInterceptor(logger);

    await firstValueFrom(
      interceptor.intercept(
        createContext({
          method: "POST",
          path: "/runtime/rooms/room_1/actions",
          response,
          headers: { "x-player-id": "player_a", "x-operator-id": "operator_1" },
        }),
        createHandler(of({ ok: true })),
      ),
    );

    expect(logger.log).toHaveBeenCalledWith({
      method: "POST",
      path: "/runtime/rooms/room_1/actions",
      status: 200,
      operatorId: "operator_1",
      playerId: "player_a",
    });
  });
});

type LoggerSink = Readonly<{
  log: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}>;

function createLogger(): LoggerSink {
  return {
    log: vi.fn(),
    error: vi.fn(),
  };
}

function createResponse(statusCode: number): Readonly<{ statusCode: number }> {
  return { statusCode };
}

function createHandler(stream: ReturnType<typeof of> | ReturnType<typeof throwError>): CallHandler {
  return { handle: () => stream };
}

function createContext(options: {
  readonly method: string;
  readonly path: string;
  readonly response: Readonly<{ statusCode: number }>;
  readonly headers?: Readonly<Record<string, string>>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: options.method, originalUrl: options.path, headers: options.headers ?? {} }),
      getResponse: () => options.response,
    }),
  } as ExecutionContext;
}

import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import type { Observable } from "rxjs";
import { catchError, tap } from "rxjs/operators";

const INTERNAL_SERVER_ERROR_STATUS = 500;
const UNKNOWN_ERROR_CODE = "UNKNOWN_ERROR";

export type RequestLogEntry = Readonly<{
  method: string;
  path: string;
  status: number;
  errorCode?: string;
  operatorId?: string;
  playerId?: string;
}>;

export type RequestLoggerSink = Readonly<{
  log(entry: RequestLogEntry): void;
  error(entry: RequestLogEntry): void;
}>;

export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: RequestLoggerSink = console) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();
    const baseEntry = createBaseEntry(request);

    return next.handle().pipe(
      tap(() => {
        this.logger.log({ ...baseEntry, status: response.statusCode });
      }),
      catchError((error: unknown) => {
        this.logger.error(createErrorEntry(baseEntry, error));
        throw error;
      }),
    );
  }
}

type RequestLike = Readonly<{
  method?: string;
  originalUrl?: string;
  url?: string;
  headers?: Readonly<Record<string, string | readonly string[] | undefined>>;
}>;

type ResponseLike = Readonly<{
  statusCode: number;
}>;

function createBaseEntry(request: RequestLike): Omit<RequestLogEntry, "status"> {
  const operatorId = readHeader(request.headers, "x-operator-id");
  const playerId = readHeader(request.headers, "x-player-id");

  return {
    method: request.method ?? "UNKNOWN",
    path: request.originalUrl ?? request.url ?? "UNKNOWN",
    ...(operatorId ? { operatorId } : {}),
    ...(playerId ? { playerId } : {}),
  };
}

function createErrorEntry(
  baseEntry: Omit<RequestLogEntry, "status">,
  error: unknown,
): RequestLogEntry {
  return {
    ...baseEntry,
    status: getErrorStatus(error),
    errorCode: getErrorCode(error),
  };
}

function getErrorStatus(error: unknown): number {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  return INTERNAL_SERVER_ERROR_STATUS;
}

function getErrorCode(error: unknown): string {
  if (error instanceof HttpException) {
    return getHttpErrorCode(error.getResponse());
  }

  return UNKNOWN_ERROR_CODE;
}

function getHttpErrorCode(response: string | object): string {
  if (typeof response === "object" && "code" in response) {
    const code = response.code;
    return typeof code === "string" ? code : UNKNOWN_ERROR_CODE;
  }

  return UNKNOWN_ERROR_CODE;
}

function readHeader(
  headers: RequestLike["headers"],
  key: string,
): string | undefined {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

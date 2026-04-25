import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

export type RequestHeaders = Readonly<Record<string, string | readonly string[] | undefined>>;

export interface RequestActor {
  readonly actorId: string;
  readonly actorType: "operator" | "player";
}

export function requireOperator(headers: RequestHeaders): RequestActor {
  const actorId = readHeader(headers, "x-operator-id");

  if (!actorId) {
    throw new UnauthorizedException({ error: "IdentityRequired", message: "x-operator-id is required" });
  }

  return { actorId, actorType: "operator" };
}

export function requirePlayer(headers: RequestHeaders, expectedPlayerId?: string): RequestActor {
  const actorId = readHeader(headers, "x-player-id");

  if (!actorId) {
    throw new UnauthorizedException({ error: "IdentityRequired", message: "x-player-id is required" });
  }

  if (expectedPlayerId && actorId !== expectedPlayerId) {
    throw new ForbiddenException({ error: "IdentityMismatch", message: "x-player-id must match playerId" });
  }

  return { actorId, actorType: "player" };
}

export function readRequestId(headers: RequestHeaders): string | undefined {
  return readHeader(headers, "x-request-id");
}

function readHeader(headers: RequestHeaders, key: string): string | undefined {
  const value = headers[key] ?? headers[key.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

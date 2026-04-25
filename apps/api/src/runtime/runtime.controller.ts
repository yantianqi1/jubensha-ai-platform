import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Sse,
  UseFilters,
  type MessageEvent,
} from "@nestjs/common";
import { RuntimeHttpErrorFilter } from "./runtime-http-error.filter.js";
import { from, type Observable } from "rxjs";
import { RuntimeService } from "./runtime-service.js";
import { AuditService } from "../audit/audit-service.js";
import { readRequestId, requirePlayer, type RequestHeaders } from "../identity/request-identity.js";

@UseFilters(RuntimeHttpErrorFilter)
@Controller("runtime")
export class RuntimeController {
  constructor(
    @Inject(RuntimeService) private readonly runtimeService: RuntimeService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  @Post("rooms")
  createRoom(@Body() body: unknown) {
    return this.runtimeService.createRoom(readCreateRoomInput(body));
  }

  @Get("rooms")
  listRooms() {
    return this.runtimeService.listRooms();
  }

  @Get("rooms/:roomId")
  getRoom(@Param("roomId") roomId: string) {
    return this.runtimeService.getRoom(roomId);
  }

  @Post("rooms/:roomId/seats/:seatId/join")
  async joinSeat(
    @Param("roomId") roomId: string,
    @Param("seatId") seatId: string,
    @Body() body: unknown,
    @Headers() headers: RequestHeaders,
  ) {
    const input = readJoinSeatInput(seatId, body);
    const actor = requirePlayer(headers, input.playerId);
    const requestId = readRequestId(headers);

    try {
      const room = await this.runtimeService.joinSeat(roomId, input);
      await this.auditService.record({ action: "join_seat", actor, targetType: "runtime_room", targetId: roomId, status: "succeeded", ...optionalRequestId(requestId) });
      return room;
    } catch (error) {
      await this.auditService.record({ action: "join_seat", actor, targetType: "runtime_room", targetId: roomId, status: "failed", ...optionalRequestId(requestId), errorCode: readErrorCode(error) });
      throw error;
    }
  }

  @Get("rooms/:roomId/snapshot")
  getPublicSnapshot(@Param("roomId") roomId: string) {
    return this.runtimeService.getPublicSnapshot(roomId);
  }

  @Get("rooms/:roomId/seats/:seatId/snapshot")
  getSeatSnapshot(@Param("roomId") roomId: string, @Param("seatId") seatId: string) {
    return this.runtimeService.getSeatSnapshot(roomId, seatId);
  }

  @Get("rooms/:roomId/admin-snapshot")
  getAdminSnapshot(@Param("roomId") roomId: string) {
    return this.runtimeService.getAdminSnapshot(roomId);
  }

  @Post("rooms/:roomId/actions")
  async applyRoomAction(
    @Param("roomId") roomId: string,
    @Body() body: unknown,
    @Headers() headers: RequestHeaders,
  ) {
    const actor = requirePlayer(headers);
    const requestId = readRequestId(headers);

    try {
      const room = await this.runtimeService.applyRoomAction(roomId, readActionInput(body));
      await this.auditService.record({ action: "apply_room_action", actor, targetType: "runtime_room", targetId: roomId, status: "succeeded", ...optionalRequestId(requestId) });
      return room;
    } catch (error) {
      await this.auditService.record({ action: "apply_room_action", actor, targetType: "runtime_room", targetId: roomId, status: "failed", ...optionalRequestId(requestId), errorCode: readErrorCode(error) });
      throw error;
    }
  }

  @Sse("rooms/:roomId/events")
  async streamRoomEvents(
    @Param("roomId") roomId: string,
    @Query("afterEventId") afterEventId?: string,
  ): Promise<Observable<MessageEvent>> {
    const input = afterEventId ? { afterEventId } : {};
    const events = await this.runtimeService.listRuntimeEvents(roomId, input);
    return from(events.map(toSseMessage));
  }

  @Post("rooms/:roomId/replay")
  replayRoom(@Param("roomId") roomId: string) {
    return this.runtimeService.replayRoom(roomId);
  }
}

function toSseMessage(event: { readonly eventId: string; readonly type: string }): MessageEvent {
  return { data: event, id: event.eventId, type: event.type };
}

function readCreateRoomInput(body: unknown) {
  if (!isObjectRecord(body) || typeof body.versionId !== "string") {
    throw new BadRequestException("versionId is required");
  }

  const seatCount = body.seatCount;

  if (typeof seatCount !== "number" || !Number.isInteger(seatCount) || seatCount <= 0) {
    throw new BadRequestException("seatCount must be a positive integer");
  }

  return { versionId: body.versionId, seatCount };
}

function readJoinSeatInput(seatId: string, body: unknown) {
  if (!isObjectRecord(body) || typeof body.playerId !== "string") {
    throw new BadRequestException("playerId is required");
  }

  return { seatId, playerId: body.playerId };
}

function readActionInput(body: unknown) {
  if (!isObjectRecord(body) || typeof body.actionCode !== "string") {
    throw new BadRequestException("actionCode is required");
  }

  return {
    actionCode: body.actionCode,
    expectedRevision: readExpectedRevision(body.expectedRevision),
  };
}

function readExpectedRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new BadRequestException("expectedRevision is required");
  }

  return value;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrorCode(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function optionalRequestId(requestId: string | undefined): { readonly requestId?: string } {
  return requestId ? { requestId } : {};
}

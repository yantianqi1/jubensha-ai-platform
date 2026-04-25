import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseFilters,
} from "@nestjs/common";
import { RuntimeHttpErrorFilter } from "./runtime-http-error.filter.js";
import { RuntimeService } from "./runtime-service.js";

@UseFilters(RuntimeHttpErrorFilter)
@Controller("runtime")
export class RuntimeController {
  constructor(@Inject(RuntimeService) private readonly runtimeService: RuntimeService) {}

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
  joinSeat(
    @Param("roomId") roomId: string,
    @Param("seatId") seatId: string,
    @Body() body: unknown,
  ) {
    return this.runtimeService.joinSeat(roomId, readJoinSeatInput(seatId, body));
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
  applyRoomAction(@Param("roomId") roomId: string, @Body() body: unknown) {
    return this.runtimeService.applyRoomAction(roomId, readActionInput(body));
  }

  @Post("rooms/:roomId/replay")
  replayRoom(@Param("roomId") roomId: string) {
    return this.runtimeService.replayRoom(roomId);
  }
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

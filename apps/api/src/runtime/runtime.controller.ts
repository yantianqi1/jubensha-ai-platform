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

  @Post("rooms/:roomId/actions")
  applyRoomAction(@Param("roomId") roomId: string, @Body() body: unknown) {
    return this.runtimeService.applyRoomAction(roomId, readActionCode(body));
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

function readActionCode(body: unknown): string {
  if (!isObjectRecord(body) || typeof body.actionCode !== "string") {
    throw new BadRequestException("actionCode is required");
  }

  return body.actionCode;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

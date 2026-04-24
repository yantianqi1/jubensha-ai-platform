import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UseFilters,
} from "@nestjs/common";
import { GenerationHttpErrorFilter } from "./generation-http-error.filter.js";
import { GenerationService } from "./generation-service.js";

@UseFilters(GenerationHttpErrorFilter)
@Controller("generation")
export class GenerationController {
  constructor(@Inject(GenerationService) private readonly generationService: GenerationService) {}

  @Post("rooms/:roomId/npc/:npcCode/ask")
  askNpc(
    @Param("roomId") roomId: string,
    @Param("npcCode") npcCode: string,
    @Body() body: unknown,
  ) {
    return this.generationService.askNpc({
      roomId,
      npcCode,
      message: readMessage(body),
    });
  }
}

function readMessage(body: unknown): string {
  if (!isObjectRecord(body) || typeof body.message !== "string" || body.message.length === 0) {
    throw new BadRequestException("message is required");
  }

  return body.message;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

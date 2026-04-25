import { BadRequestException, Body, Controller, Get, Header, Inject, Param, Post, Query, Sse, UseFilters, type MessageEvent } from "@nestjs/common";
import { parseStoryBible } from "@jubensha/dsl";
import { CreationHttpErrorFilter } from "./creation-http-error.filter.js";
import { CreationOrchestrator } from "./creation-orchestrator.js";
import { from, type Observable } from "rxjs";
import { CreationService } from "./creation-service.js";
import { GenerationJobService, type GenerationJobEventEnvelope } from "./generation-job.js";
import { toGenerationJobDetailResponse } from "./generation-job-detail.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";

@UseFilters(CreationHttpErrorFilter)
@Controller("creation")
export class CreationController {
  constructor(
    @Inject(CreationService) private readonly creationService: CreationService,
    @Inject(CreationOrchestrator) private readonly orchestrator: CreationOrchestrator,
    @Inject(GenerationJobService) private readonly generationJobs: GenerationJobService,
  ) {}

  @Post("story-bibles/generate")
  generateStoryBible(@Body() body: unknown) {
    return this.orchestrator.generateStoryBible(readGenerateRequest(body));
  }

  @Post("generation-jobs")
  @Header("Cache-Control", "no-store")
  async createGenerationJob(@Body() body: unknown) {
    const job = await this.generationJobs.createJob(readGenerateRequest(body));
    return toGenerationJobDetailResponse(job);
  }

  @Get("generation-jobs/:jobId")
  @Header("Cache-Control", "no-store")
  async getGenerationJob(@Param("jobId") jobId: string) {
    const job = await this.generationJobs.getJob(jobId);
    return toGenerationJobDetailResponse(job);
  }

  @Post("generation-jobs/:jobId/run")
  @Header("Cache-Control", "no-store")
  async runGenerationJob(@Param("jobId") jobId: string) {
    const job = await this.generationJobs.runJob(jobId);
    return toGenerationJobDetailResponse(job);
  }

  @Sse("generation-jobs/:jobId/events")
  async streamGenerationJobEvents(
    @Param("jobId") jobId: string,
    @Query("afterEventId") afterEventId?: string,
  ): Promise<Observable<MessageEvent>> {
    const input = afterEventId ? { afterEventId } : {};
    const events = await this.generationJobs.listJobEvents(jobId, input);
    return from(events.map(toGenerationJobSseMessage));
  }

  @Post("story-bibles/compile-draft")
  compileStoryBibleDraft(@Body() body: unknown) {
    const storyBible = parseStoryBible(readStoryBible(body));

    return this.creationService.createDraftFromStoryBible(storyBible);
  }
}

function readStoryBible(body: unknown): unknown {
  if (!isObjectRecord(body) || !("storyBible" in body)) {
    throw new BadRequestException({
      error: "InvalidRequest",
      message: "storyBible is required",
    });
  }

  return body.storyBible;
}

function readGenerateRequest(body: unknown): StoryPlannerInput {
  if (!isObjectRecord(body)) {
    throw new BadRequestException({ error: "InvalidRequest", message: "request body is required" });
  }

  const request: StoryPlannerInput = {
    premise: readRequiredString(body, "premise"),
    playerCount: readRequiredPositiveInteger(body, "playerCount"),
  };

  return addOptionalGenerateFields(request, body);
}

function addOptionalGenerateFields(
  request: StoryPlannerInput,
  body: Record<string, unknown>,
): StoryPlannerInput {
  return {
    ...request,
    ...optionalField("title", readOptionalString(body, "title")),
    ...optionalField("genre", readOptionalString(body, "genre")),
    ...optionalField("tone", readOptionalString(body, "tone")),
    ...optionalField("difficulty", readOptionalString(body, "difficulty")),
    ...optionalField("supernaturalAllowed", readOptionalBoolean(body, "supernaturalAllowed")),
    ...optionalField("themeStatement", readOptionalString(body, "themeStatement")),
    ...optionalField("durationMinutes", readOptionalPositiveInteger(body, "durationMinutes")),
  };
}

function optionalField<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}

function readRequiredString(body: Record<string, unknown>, key: string): string {
  const value = readOptionalString(body, key);

  if (!value) {
    throw new BadRequestException({ error: "InvalidRequest", message: `${key} is required` });
  }

  return value;
}

function readRequiredPositiveInteger(body: Record<string, unknown>, key: string): number {
  const value = readOptionalPositiveInteger(body, key);

  if (value === undefined) {
    throw new BadRequestException({ error: "InvalidRequest", message: `${key} is required` });
  }

  return value;
}

function readOptionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readOptionalBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key];

  return typeof value === "boolean" ? value : undefined;
}

function readOptionalPositiveInteger(body: Record<string, unknown>, key: string): number | undefined {
  const value = body[key];

  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toGenerationJobSseMessage(event: GenerationJobEventEnvelope): MessageEvent {
  return { data: event, id: event.eventId, type: event.type };
}

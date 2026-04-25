import { BadRequestException, Body, ConflictException, Controller, Get, Headers, NotFoundException, Param, Post } from "@nestjs/common";
import { parseStoryBible } from "@jubensha/dsl";
import { compileThemeAssets } from "./theme-asset-compiler.js";
import { ThemeAssetJobConflictError, ThemeAssetJobExecutor, ThemeAssetJobStore } from "./theme-asset-job.js";
import { AuditService } from "../audit/audit-service.js";
import { readRequestId, requireOperator, type RequestHeaders } from "../identity/request-identity.js";

@Controller("creation/theme-assets/jobs")
export class ThemeAssetJobController {
  constructor(
    private readonly jobs: ThemeAssetJobStore,
    private readonly executor: ThemeAssetJobExecutor,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  createThemeAssetJob(@Body() body: unknown) {
    const storyBible = parseStoryBible(readStoryBible(body));
    const manifest = compileThemeAssets(storyBible);

    return this.jobs.createJob({ storyBible, manifest });
  }

  @Post(":jobId/run")
  async runThemeAssetJob(@Param("jobId") jobId: string, @Headers() headers: RequestHeaders) {
    const actor = requireOperator(headers);
    const requestId = readRequestId(headers);

    try {
      const job = await this.executor.runJob(jobId);

      if (!job) {
        throw new NotFoundException({ error: "ThemeAssetJobNotFoundError", message: "Theme asset job not found" });
      }

      await this.auditService.record({
        action: "run_asset_job",
        actor,
        targetType: "theme_asset_job",
        targetId: jobId,
        status: job.status === "failed" ? "failed" : "succeeded",
        ...optionalRequestId(requestId),
        ...(job.failure ? { errorCode: job.failure.code } : {}),
      });
      return job;
    } catch (error) {
      await this.auditService.record({
        action: "run_asset_job",
        actor,
        targetType: "theme_asset_job",
        targetId: jobId,
        status: "failed",
        ...optionalRequestId(requestId),
        errorCode: readErrorCode(error),
      });

      if (error instanceof ThemeAssetJobConflictError) {
        throw new ConflictException({ error: error.name, message: error.message });
      }

      throw error;
    }
  }

  @Get(":jobId")
  getThemeAssetJob(@Param("jobId") jobId: string) {
    const job = this.jobs.getJob(jobId);

    if (job === undefined) {
      throw new NotFoundException({ error: "ThemeAssetJobNotFoundError", message: "Theme asset job not found" });
    }

    return job;
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrorCode(error: unknown): string {
  if (error instanceof NotFoundException) {
    return "ThemeAssetJobNotFoundError";
  }

  return error instanceof Error ? error.name : "UnknownError";
}

function optionalRequestId(requestId: string | undefined): { readonly requestId?: string } {
  return requestId ? { requestId } : {};
}

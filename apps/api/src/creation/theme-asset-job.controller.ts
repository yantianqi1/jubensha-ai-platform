import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { parseStoryBible } from "@jubensha/dsl";
import { compileThemeAssets } from "./theme-asset-compiler.js";
import { ThemeAssetJobExecutor, ThemeAssetJobStore } from "./theme-asset-job.js";

@Controller("creation/theme-assets/jobs")
export class ThemeAssetJobController {
  constructor(
    private readonly jobs: ThemeAssetJobStore,
    private readonly executor: ThemeAssetJobExecutor,
  ) {}

  @Post()
  createThemeAssetJob(@Body() body: unknown) {
    const storyBible = parseStoryBible(readStoryBible(body));
    const manifest = compileThemeAssets(storyBible);

    return this.jobs.createJob({ storyBible, manifest });
  }

  @Post(":jobId/run")
  async runThemeAssetJob(@Param("jobId") jobId: string) {
    const job = await this.executor.runJob(jobId);

    if (!job) {
      throw new NotFoundException({ error: "ThemeAssetJobNotFoundError", message: "Theme asset job not found" });
    }

    return job;
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

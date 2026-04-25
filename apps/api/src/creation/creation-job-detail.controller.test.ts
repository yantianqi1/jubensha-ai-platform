import { describe, expect, it } from "vitest";
import { CreationOrchestrator } from "./creation-orchestrator.js";
import { CreationController } from "./creation.controller.js";
import { CreationService } from "./creation-service.js";
import { createInitialJob } from "./generation-job-model.js";
import type { GenerationJobService } from "./generation-job.js";
import { brief, createService } from "./generation-job-test-fixtures.js";

describe("CreationController generation job detail DTO", () => {
  it("GET generation job returns polling-friendly detail DTO", async () => {
    const job = createInitialJob("generation_job_1", brief, "2026-04-25T08:00:00.000Z");
    const controller = createController({ getJob: async () => job });

    const detail = await controller.getGenerationJob(job.id);

    expect(detail).toMatchObject({
      jobId: job.id,
      status: "queued",
      currentStage: "queued",
      progressPercent: 8,
      stages: expect.any(Array),
      activity: expect.any(Array),
      result: { readyForPublish: null, draftPackageId: null, errors: [] },
    });
  });

  it("run endpoint returns the same compatible detail DTO after completion", async () => {
    const service = createService();
    const queued = await service.createJob(brief);
    const controller = createController({ runJob: (jobId) => service.runJob(jobId) });

    const detail = await controller.runGenerationJob(queued.id);

    expect(detail.status).toBe("ready_for_review");
    expect(detail.progressPercent).toBe(100);
    expect(detail.result.draftPackageId).toBe("package_1");
    expect(detail.result.readyForPublish).toBe(true);
    expect(detail.result.storyBibleSummary?.title).toBe("雾港新案");
  });

  it("create endpoint also returns queued detail for immediate polling", async () => {
    const job = createInitialJob("generation_job_1", brief, "2026-04-25T08:00:00.000Z");
    const controller = createController({ createJob: async () => job });

    const detail = await controller.createGenerationJob(brief);

    expect(detail).toMatchObject({ jobId: job.id, status: "queued", currentStage: "queued" });
  });

  it("polling detail does not require SSE events", async () => {
    let sseCalled = false;
    const job = createInitialJob("generation_job_1", brief, "2026-04-25T08:00:00.000Z");
    const controller = createController({
      getJob: async () => job,
      listJobEvents: async () => {
        sseCalled = true;
        return [];
      },
    });

    await controller.getGenerationJob(job.id);

    expect(sseCalled).toBe(false);
  });
});

function createController(jobs: Partial<GenerationJobService>): CreationController {
  return new CreationController(
    { createDraftFromStoryBible: async () => ({}) } as CreationService,
    { generateStoryBible: async () => ({}) } as CreationOrchestrator,
    {
      createJob: async () => createInitialJob("generation_job_1", brief, "2026-04-25T08:00:00.000Z"),
      getJob: async () => createInitialJob("generation_job_1", brief, "2026-04-25T08:00:00.000Z"),
      runJob: async () => createInitialJob("generation_job_1", brief, "2026-04-25T08:00:00.000Z"),
      listJobEvents: async () => [],
      ...jobs,
    } as unknown as GenerationJobService,
  );
}

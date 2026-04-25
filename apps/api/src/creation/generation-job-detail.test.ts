import { describe, expect, it } from "vitest";
import { createInitialJob, toPipelineJob } from "./generation-job-model.js";
import {
  mapGenerationJobProgress,
  toGenerationJobDetailResponse,
  type GenerationJobUiStageKey,
} from "./generation-job-detail.js";
import {
  CapturingDraftWriter,
  FixedReviewer,
  brief,
  buildStoryBible,
  createService,
  createStoryResult,
  deterministicDiagnostic,
  storyBible,
} from "./generation-job-test-fixtures.js";
import type { ScriptRepairAgent, ScriptRepairInput } from "./script-repair-agent.js";

describe("generation job detail response", () => {
  it("returns a front-end friendly DTO for queued jobs", () => {
    const job = createInitialJob("generation_job_1", brief, "2026-04-25T08:00:00.000Z");

    const detail = toGenerationJobDetailResponse(job);

    expect(detail).toMatchObject({
      jobId: "generation_job_1",
      status: "queued",
      currentStage: "queued",
      progressPercent: 8,
      input: { title: "雾港新案", premise: "雾港旧账牵出失踪案", playerCount: 1, genre: "mystery" },
      result: { readyForPublish: null, draftPackageId: null, errors: [] },
    });
    expect(detail.stages[0]).toMatchObject({ key: "queued", state: "active" });
    expect(detail.activity[0]).toMatchObject({ level: "info", message: "Job queued" });
  });

  it("returns ready result summaries without leaking private role secrets", async () => {
    const draftWriter = new CapturingDraftWriter();
    const service = createService({ draftWriter });
    const queued = await service.createJob(brief);

    const completed = await service.runJob(queued.id);
    const detail = toGenerationJobDetailResponse(completed);

    expect(detail.status).toBe("ready_for_review");
    expect(detail.currentStage).toBe("ready_for_review");
    expect(detail.progressPercent).toBe(100);
    expect(detail.stages.every((stage) => stage.state === "completed")).toBe(true);
    expect(detail.result.readyForPublish).toBe(true);
    expect(detail.result.draftPackageId).toBe("package_1");
    expect(detail.result.storyBibleSummary).toMatchObject({ title: "雾港新案", roleCount: 1, clueCount: 1, actCount: 1 });
    expect(detail.result.criticReview).toMatchObject({ passed: true, issueCount: 0, requiredRevisions: [] });
    expect(detail.result.scriptPackageDraftSummary).toMatchObject({ title: "雾港新案", roleCount: 1, clueCount: 1 });
    expect(JSON.stringify(detail.result.storyBibleSummary)).not.toContain("调换账本");
    expect(JSON.stringify(detail.result.scriptPackageDraftSummary)).not.toContain("private_secret");
  });

  it("returns blocked stages and visible deterministic diagnostics", async () => {
    const service = createService({ qualityReviewer: new FixedReviewer(false, [deterministicDiagnostic]) });
    const queued = await service.createJob(brief);

    const blocked = toGenerationJobDetailResponse(await service.runJob(queued.id));

    expect(blocked.status).toBe("blocked");
    expect(blocked.currentStage).toBe("blocked");
    expect(blocked.progressPercent).toBe(88);
    expect(blocked.result.readyForPublish).toBe(false);
    expect(blocked.result.qualityReport?.issues).toEqual([
      { severity: "error", code: "missing_clue", path: "scenes.act1", message: "Missing clue reference: missing" },
    ]);
    expect(blocked.stages.find((stage) => stage.key === "deterministic_review")).toMatchObject({ state: "blocked" });
    expect(blocked.activity.some((item) => item.message === "Deterministic review found blocking errors")).toBe(true);
  });

  it("returns repair summary for repaired generation jobs", async () => {
    const service = createService({
      repairAgent: new DetailRepairAgent(buildStoryBible(true)),
      storyResult: createStoryResult([], buildStoryBible(false)),
    });
    const queued = await service.createJob(brief);

    const detail = toGenerationJobDetailResponse(await service.runJob(queued.id));

    expect(detail.result.repairSummary).toMatchObject({
      attempted: true,
      succeeded: true,
      attemptCount: 1,
      maxAttempts: 1,
      issueCount: 1,
    });
    expect(detail.activity).toContainEqual(expect.objectContaining({ code: "quality_repair", message: "Quality repair succeeded" }));
  });

  it("returns failed stage and structured error activity", async () => {
    const service = createService({ fail: true });
    const queued = await service.createJob(brief);

    const failed = toGenerationJobDetailResponse(await service.runJob(queued.id));

    expect(failed.status).toBe("failed");
    expect(failed.currentStage).toBe("failed");
    expect(failed.progressPercent).toBe(24);
    expect(failed.stages.find((stage) => stage.key === "planning_story")).toMatchObject({ state: "failed" });
    expect(failed.activity).toContainEqual(expect.objectContaining({ level: "error", code: "pipeline_error", message: "Job failed: pipeline_error" }));
  });

  it("maps progress deterministically for every supported stage", () => {
    const keys: GenerationJobUiStageKey[] = [
      "queued",
      "received_brief",
      "planning_story",
      "criticizing_story",
      "compiling_draft",
      "deterministic_review",
      "ready_for_review",
      "blocked",
      "failed",
    ];

    expect(keys.map((key) => [key, mapGenerationJobProgress(key).progressPercent])).toEqual([
      ["queued", 8],
      ["received_brief", 12],
      ["planning_story", 24],
      ["criticizing_story", 42],
      ["compiling_draft", 62],
      ["deterministic_review", 82],
      ["ready_for_review", 100],
      ["blocked", 88],
      ["failed", 24],
    ]);
  });
});

class DetailRepairAgent implements ScriptRepairAgent {
  constructor(private readonly repairedStoryBible: ReturnType<typeof buildStoryBible>) {}

  async repairStoryBible(_input: ScriptRepairInput) {
    return { repairedStoryBible: this.repairedStoryBible, diagnostics: [] };
  }
}

import { describe, expect, it } from "vitest";
import { mapGenerationJobDetailToView, createScriptCreationJobLiveController } from "./script-creation-job-live.js";
import type { GenerationJob } from "./api-client-types.js";

const readyJob: GenerationJob = {
  jobId: "generation_job_1",
  status: "ready_for_review",
  currentStage: "ready_for_review",
  progressPercent: 100,
  createdAt: "2026-04-25T08:00:00.000Z",
  updatedAt: "2026-04-25T08:01:00.000Z",
  input: { title: "雾港新案", premise: "雾港旧账牵出失踪案", playerCount: 4, genre: "mystery" },
  stages: [],
  activity: [{ id: "a1", stage: "deterministic_review", level: "success", message: "Deterministic review passed", timestamp: "2026-04-25T08:01:00.000Z" }],
  result: {
    storyBibleSummary: { title: "雾港新案", logline: "雾港旧账", genre: "mystery", tone: "阴冷", roleCount: 4, clueCount: 12, actCount: 3, timelineCount: 6 },
    criticReview: { passed: true, severity: "info", issueCount: 0, requiredRevisions: [] },
    scriptPackageDraftSummary: { title: "雾港新案", packageCode: "story_bible_draft", status: "draft", roleCount: 4, clueCount: 12, sceneCount: 9 },
    qualityReport: { readyForPublish: true, errorCount: 0, warningCount: 1, issueCount: 1, issues: [{ severity: "warning", code: "pacing", message: "节奏偏慢" }] },
    readyForPublish: true,
    draftPackageId: "package_1",
    errors: [],
  },
};

describe("script creation job live mapping", () => {
  it("maps backend job detail into the existing polished UI view model", () => {
    const view = mapGenerationJobDetailToView(readyJob);

    expect(view).toMatchObject({
      id: "generation_job_1",
      stage: "ready_for_review",
      progress: 100,
      readyForPublish: true,
      storyBible: { premise: "雾港旧账", theme: "阴冷" },
      draftPackage: { packageId: "package_1", scenes: 9, clues: 12 },
      qualityReport: { score: 99 },
    });
    expect(view.activity[0]).toMatchObject({ title: "Deterministic review passed", severity: "info" });
  });

  it("polls existing running jobs until a terminal state", async () => {
    const rendered: string[] = [];
    const pollTimers: Array<() => void> = [];
    const queued = { ...readyJob, status: "queued", currentStage: "queued", progressPercent: 8, result: { readyForPublish: null, draftPackageId: null, errors: [] } } satisfies GenerationJob;
    const final = { ...readyJob } satisfies GenerationJob;
    const controller = createScriptCreationJobLiveController({
      readBrief: () => ({ premise: "雾港", playerCount: 4 }),
      readJobId: () => "generation_job_1",
      writeJobId: () => undefined,
      createJob: async () => queued,
      runJob: async () => final,
      getJob: async () => rendered.length === 0 ? queued : final,
      renderJob: (job) => rendered.push(job.stage),
      renderError: (message) => rendered.push(`error:${message}`),
      setTimer: (callback) => { pollTimers.push(callback); return pollTimers.length; },
      clearTimer: () => undefined,
    });

    await controller.loadExistingJob();
    pollTimers[0]?.();
    await Promise.resolve();

    expect(rendered).toEqual(["queued", "ready_for_review"]);
  });

  it("creates, runs, and renders a job without inventing progress events", async () => {
    const rendered: string[] = [];
    const controller = createScriptCreationJobLiveController({
      readBrief: () => ({ premise: "雾港", playerCount: 4 }),
      readJobId: () => "",
      writeJobId: (jobId) => rendered.push(`id:${jobId}`),
      createJob: async () => ({ ...readyJob, jobId: "generation_job_2", currentStage: "queued", progressPercent: 8, status: "queued" }),
      runJob: async () => ({ ...readyJob, jobId: "generation_job_2" }),
      getJob: async () => readyJob,
      renderJob: (job) => rendered.push(job.stage),
      renderError: (message) => rendered.push(`error:${message}`),
      setTimer: () => 0,
      clearTimer: () => undefined,
    });

    await controller.createAndRunJob();

    expect(rendered).toEqual(["id:generation_job_2", "queued", "ready_for_review"]);
  });
});

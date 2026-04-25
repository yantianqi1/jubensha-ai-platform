import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { GenerationJobNotFoundError } from "./generation-job.js";
import { evaluateGenerationJobRecord } from "./script-quality-evaluator.js";
import {
  CapturingDraftWriter,
  FixedReviewer,
  brief,
  buildStoryBible,
  createService,
  createStoryResult,
  criticDiagnostic,
  deterministicDiagnostic,
  storyBible,
} from "./generation-job-test-fixtures.js";

describe("GenerationJobService", () => {
  it("creates inspectable queued generation jobs", async () => {
    const service = createService();

    const job = await service.createJob(brief);

    expect(job).toMatchObject({
      id: "generation_job_1",
      status: "queued",
      brief,
      attempts: [],
      selectedAttemptId: null,
      draftPackageId: null,
      diagnostics: [],
      pipelineResult: null,
      readyForPublish: null,
      createdAt: "2026-04-25T08:00:00.000Z",
      updatedAt: "2026-04-25T08:00:00.000Z",
    });
    await expect(service.getJob(job.id)).resolves.toEqual(job);
  });

  it("runs full pipeline, saves a content draft, and stores structured result", async () => {
    const draftWriter = new CapturingDraftWriter();
    const service = createService({ draftWriter });
    const queued = await service.createJob(brief);

    const completed = await service.runJob(queued.id);

    expect(completed.status).toBe("ready_for_review");
    expect(completed.readyForPublish).toBe(true);
    expect(completed.draftPackageId).toBe("package_1");
    expect(completed.selectedAttemptId).toBe("generation_job_1_attempt_1");
    expect(completed.attempts).toHaveLength(1);
    expect(completed.pipelineResult).toMatchObject({
      runId: "generation_job_1",
      status: "ready_for_review",
      readyForPublish: true,
      storyBible,
      criticDiagnostics: [],
      scriptPackageDraft: { title: "雾港新案", status: "draft" },
      draftResult: { readyForPublish: true },
      errors: [],
    });
    expect(completed.pipelineResult?.qualityReport?.readyForPublish).toBe(true);
    expect(evaluateGenerationJobRecord(completed)).toMatchObject({
      readiness: "ready_for_review",
      artifacts: { draftPackageIdPresent: true, readyForPublish: true },
    });
    expect(draftWriter.savedPackages).toHaveLength(1);
    expect(draftWriter.releasedVersions).toEqual([]);
  });

  it("stores critic-blocked pipeline result without saving a draft", async () => {
    const draftWriter = new CapturingDraftWriter();
    const service = createService({ storyResult: createStoryResult([criticDiagnostic]), draftWriter });
    const queued = await service.createJob(brief);

    const blocked = await service.runJob(queued.id);

    expect(blocked.status).toBe("blocked");
    expect(blocked.readyForPublish).toBe(false);
    expect(blocked.draftPackageId).toBeNull();
    expect(blocked.pipelineResult).toMatchObject({
      status: "blocked",
      criticDiagnostics: [criticDiagnostic],
      errors: [{ code: "critic.timeline_conflict", stage: "criticizing_story" }],
    });
    expect(blocked.pipelineResult?.scriptPackageDraft).toBeUndefined();
    expect(blocked.diagnostics).toEqual([
      { severity: "error", code: "critic.timeline_conflict", path: "truth.timeline", message: "时间线冲突。" },
    ]);
    expect(evaluateGenerationJobRecord(blocked)).toMatchObject({
      readiness: "blocked",
      artifacts: { scriptPackageDraftPresent: false, draftPackageIdPresent: false },
      issues: [expect.objectContaining({ code: "critic.timeline_conflict", stage: "critic" })],
    });
    expect(draftWriter.savedPackages).toEqual([]);
  });

  it("stores compiler failure and does not save a draft", async () => {
    const draftWriter = new CapturingDraftWriter();
    const service = createService({ storyResult: createStoryResult([], buildStoryBible(false)), draftWriter });
    const queued = await service.createJob(brief);

    const failed = await service.runJob(queued.id);

    expect(failed.status).toBe("failed");
    expect(failed.readyForPublish).toBe(false);
    expect(failed.draftPackageId).toBeNull();
    expect(failed.pipelineResult?.errors[0]).toMatchObject({ code: "compiler_error", stage: "compiling_draft" });
    expect(failed.diagnostics[0]).toMatchObject({ code: "compiler_error", path: "scriptPackageDraft" });
    expect(evaluateGenerationJobRecord(failed)).toMatchObject({
      readiness: "failed",
      artifacts: { scriptPackageDraftPresent: false, draftPackageIdPresent: false },
      issues: [expect.objectContaining({ code: "compiler_error", stage: "compiler" })],
    });
    expect(draftWriter.savedPackages).toEqual([]);
  });

  it("stores deterministic quality failure and still saves the draft for review", async () => {
    const draftWriter = new CapturingDraftWriter();
    const service = createService({
      draftWriter,
      qualityReviewer: new FixedReviewer(false, [deterministicDiagnostic]),
    });
    const queued = await service.createJob(brief);

    const blocked = await service.runJob(queued.id);

    expect(blocked.status).toBe("blocked");
    expect(blocked.readyForPublish).toBe(false);
    expect(blocked.draftPackageId).toBe("package_1");
    expect(blocked.pipelineResult?.qualityReport?.diagnostics).toEqual([deterministicDiagnostic]);
    expect(blocked.diagnostics).toEqual([
      { severity: "error", code: "missing_clue", path: "scenes.act1", message: "Missing clue reference: missing" },
    ]);
    expect(evaluateGenerationJobRecord(blocked)).toMatchObject({
      readiness: "blocked",
      artifacts: { scriptPackageDraftPresent: true, draftPackageIdPresent: true, readyForPublish: false },
      issues: [expect.objectContaining({ code: "missing_clue", stage: "quality_gate" })],
    });
    expect(draftWriter.savedPackages).toHaveLength(1);
    expect(draftWriter.releasedVersions).toEqual([]);
  });

  it("stores explicit failed job diagnostics when the model path throws", async () => {
    const service = createService({ fail: true });
    const queued = await service.createJob(brief);

    const failed = await service.runJob(queued.id);

    expect(failed).toMatchObject({
      status: "failed",
      readyForPublish: false,
      diagnostics: [
        {
          severity: "error",
          code: "pipeline_error",
          message: "provider offline",
          path: "$",
        },
      ],
      pipelineResult: { status: "failed", errors: [{ code: "pipeline_error", message: "provider offline" }] },
    });
  });

  it("projects ordered job events after a cursor", async () => {
    const service = createService();
    const queued = await service.createJob(brief);
    await service.runJob(queued.id);

    const events = await service.listJobEvents(queued.id, { afterEventId: `${queued.id}:1` });

    expect(events.map((event) => event.eventId)).toEqual([
      `${queued.id}:2`,
      `${queued.id}:3`,
    ]);
    expect(events.map((event) => event.type)).toEqual(["job_status_changed", "attempt_recorded"]);
  });

  it("rejects missing jobs explicitly", async () => {
    const service = createService();

    await expect(service.getJob("missing")).rejects.toThrow(new GenerationJobNotFoundError("Generation job not found: missing"));
  });

  it("does not import runtime services", async () => {
    const source = await readFile(new URL("./generation-job.ts", import.meta.url), "utf8");

    expect(source).not.toContain("../runtime");
    expect(source).not.toContain("RuntimeService");
  });
});

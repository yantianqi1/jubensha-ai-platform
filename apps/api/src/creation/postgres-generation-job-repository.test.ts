import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPostgresPool, readDatabaseUrl } from "../content/content-database.js";
import { ensureGenerationJobSchema } from "./postgres-generation-job-schema.js";
import { PostgresGenerationJobRepository } from "./postgres-generation-job-repository.js";
import type { GenerationJobRecord } from "./generation-job.js";

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

let pool: Pool;

describeWithDatabase("PostgresGenerationJobRepository", () => {
  beforeAll(async () => {
    pool = createPostgresPool(readDatabaseUrl());
    await ensureGenerationJobSchema(pool);
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM generation_jobs");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("saves and loads generation jobs", async () => {
    const repository = new PostgresGenerationJobRepository(pool);
    const job = createJob("generation_job_1", "queued");

    await repository.saveJob(job);

    await expect(repository.findJob(job.id)).resolves.toEqual(job);
  });

  it("updates existing generation jobs", async () => {
    const repository = new PostgresGenerationJobRepository(pool);
    const queued = createJob("generation_job_1", "queued");
    const ready = { ...queued, status: "ready_for_review" as const, updatedAt: "2026-04-25T08:01:00.000Z" };

    await repository.saveJob(queued);
    await repository.saveJob(ready);

    await expect(repository.findJob(queued.id)).resolves.toMatchObject({ status: "ready_for_review" });
  });

  it("roundtrips pipeline result fields", async () => {
    const repository = new PostgresGenerationJobRepository(pool);
    const job = {
      ...createJob("generation_job_1", "blocked"),
      draftPackageId: "package_1",
      readyForPublish: false,
      pipelineResult: {
        runId: "generation_job_1",
        inputSummary: { premise: "雾港旧账", playerCount: 4 },
        stage: "blocked" as const,
        status: "blocked" as const,
        readyForPublish: false,
        errors: [
          {
            severity: "error" as const,
            code: "missing_clue",
            path: "scenes.act1",
            message: "Missing clue reference",
            stage: "deterministic_review" as const,
          },
        ],
        storyBible: { meta: { title: "雾港旧账" } } as never,
        criticDiagnostics: [],
        scriptPackageDraft: { title: "雾港旧账", status: "draft" } as never,
        qualityReport: {
          readyForPublish: false,
          diagnostics: [],
          summary: { errors: 1, warnings: 0, info: 0 },
          report: { headline: "blocked", readinessLabel: "blocked" as const, sections: [] },
        },
      },
    };

    await repository.saveJob(job);

    await expect(repository.findJob(job.id)).resolves.toEqual(job);
  });
});

function createJob(id: string, status: GenerationJobRecord["status"]): GenerationJobRecord {
  return {
    id,
    status,
    brief: { premise: "雾港旧账", playerCount: 4 },
    attempts: [],
    selectedAttemptId: null,
    draftPackageId: null,
    readyForPublish: null,
    pipelineResult: null,
    diagnostics: [],
    events: [{ eventId: `${id}:1`, jobId: id, sequence: 1, type: "job_created", payload: { status } }],
    createdAt: "2026-04-25T08:00:00.000Z",
    updatedAt: "2026-04-25T08:00:00.000Z",
  };
}

import type { Pool } from "pg";
import type {
  GenerationAttemptRecord,
  GenerationDiagnostic,
  GenerationJobEventEnvelope,
  GenerationJobRecord,
  GenerationJobRepository,
  GenerationJobStatus,
} from "./generation-job.js";
import type { StoryPlannerInput } from "./story-planner-agent.js";

interface GenerationJobRow {
  readonly id: string;
  readonly status: GenerationJobStatus;
  readonly brief: StoryPlannerInput;
  readonly attempts: readonly GenerationAttemptRecord[];
  readonly selected_attempt_id: string | null;
  readonly draft_package_id: string | null;
  readonly ready_for_publish: boolean | null;
  readonly pipeline_result: GenerationJobRecord["pipelineResult"];
  readonly diagnostics: readonly GenerationDiagnostic[];
  readonly events: readonly GenerationJobEventEnvelope[];
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

const UPSERT_GENERATION_JOB_SQL = `
INSERT INTO generation_jobs (
  id,
  status,
  brief,
  attempts,
  selected_attempt_id,
  draft_package_id,
  ready_for_publish,
  pipeline_result,
  diagnostics,
  events,
  created_at,
  updated_at
)
VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    brief = EXCLUDED.brief,
    attempts = EXCLUDED.attempts,
    selected_attempt_id = EXCLUDED.selected_attempt_id,
    draft_package_id = EXCLUDED.draft_package_id,
    ready_for_publish = EXCLUDED.ready_for_publish,
    pipeline_result = EXCLUDED.pipeline_result,
    diagnostics = EXCLUDED.diagnostics,
    events = EXCLUDED.events,
    updated_at = EXCLUDED.updated_at
`;

export class PostgresGenerationJobRepository implements GenerationJobRepository {
  constructor(private readonly pool: Pool) {}

  async saveJob(job: GenerationJobRecord): Promise<GenerationJobRecord> {
    await this.pool.query(UPSERT_GENERATION_JOB_SQL, [
      job.id,
      job.status,
      JSON.stringify(job.brief),
      JSON.stringify(job.attempts),
      job.selectedAttemptId,
      job.draftPackageId,
      job.readyForPublish,
      JSON.stringify(job.pipelineResult),
      JSON.stringify(job.diagnostics),
      JSON.stringify(job.events),
      job.createdAt,
      job.updatedAt,
    ]);

    return job;
  }

  async findJob(jobId: string): Promise<GenerationJobRecord | null> {
    const result = await this.pool.query<GenerationJobRow>(
      `
      SELECT id, status, brief, attempts, selected_attempt_id, draft_package_id,
             ready_for_publish, pipeline_result, diagnostics, events, created_at, updated_at
      FROM generation_jobs
      WHERE id = $1
      `,
      [jobId],
    );

    return result.rows[0] ? toGenerationJobRecord(result.rows[0]) : null;
  }
}

function toGenerationJobRecord(row: GenerationJobRow): GenerationJobRecord {
  return {
    id: row.id,
    status: row.status,
    brief: row.brief,
    attempts: row.attempts,
    selectedAttemptId: row.selected_attempt_id,
    draftPackageId: row.draft_package_id,
    readyForPublish: row.ready_for_publish,
    pipelineResult: row.pipeline_result,
    diagnostics: row.diagnostics,
    events: row.events,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

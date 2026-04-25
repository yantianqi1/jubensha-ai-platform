import type { Pool, PoolClient } from "pg";

export const GENERATION_JOB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS generation_jobs (
  id text PRIMARY KEY,
  status text NOT NULL,
  brief jsonb NOT NULL,
  attempts jsonb NOT NULL,
  selected_attempt_id text,
  draft_package_id text,
  ready_for_publish boolean,
  pipeline_result jsonb,
  diagnostics jsonb NOT NULL,
  events jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
`;

const GENERATION_JOB_SCHEMA_MIGRATIONS = [
  "ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS ready_for_publish boolean",
  "ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS pipeline_result jsonb",
];

export async function ensureGenerationJobSchema(client: Pool | PoolClient): Promise<void> {
  await client.query(GENERATION_JOB_SCHEMA_SQL);

  for (const migration of GENERATION_JOB_SCHEMA_MIGRATIONS) {
    await client.query(migration);
  }
}

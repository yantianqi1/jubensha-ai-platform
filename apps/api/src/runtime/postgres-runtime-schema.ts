import type { Pool, PoolClient } from "pg";

export const RUNTIME_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS runtime_rooms (
  id text PRIMARY KEY,
  version_id text NOT NULL,
  package_code text NOT NULL,
  current_scene_code text NOT NULL,
  state jsonb NOT NULL,
  events jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

export async function ensureRuntimeSchema(client: Pool | PoolClient): Promise<void> {
  await client.query(RUNTIME_SCHEMA_SQL);
}

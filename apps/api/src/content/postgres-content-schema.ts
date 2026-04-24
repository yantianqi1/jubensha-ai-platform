import type { Pool, PoolClient } from "pg";

export const CONTENT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS script_packages (
  id text PRIMARY KEY,
  current_draft jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS script_versions (
  id text PRIMARY KEY,
  package_id text NOT NULL REFERENCES script_packages(id) ON DELETE CASCADE,
  semver text NOT NULL,
  state text NOT NULL CHECK (state = 'released'),
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, semver)
);
`;

export async function ensureContentSchema(client: Pool | PoolClient): Promise<void> {
  await client.query(CONTENT_SCHEMA_SQL);
}

import type { Pool, PoolClient } from "pg";

export const AUDIT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  action text NOT NULL,
  actor_id text NOT NULL,
  actor_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  status text NOT NULL,
  request_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_target_idx ON audit_events (target_type, target_id, created_at DESC, id DESC);
`;

export async function ensureAuditSchema(client: Pool | PoolClient): Promise<void> {
  await client.query(AUDIT_SCHEMA_SQL);
}

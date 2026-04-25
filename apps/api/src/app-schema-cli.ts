import { loadEnv } from "./load-env.js";

loadEnv();
import { createPostgresPool, readDatabaseUrl } from "./content/content-database.js";
import { ensureContentSchema } from "./content/postgres-content-schema.js";
import { ensureRuntimeSchema } from "./runtime/postgres-runtime-schema.js";
import { ensureGenerationJobSchema } from "./creation/postgres-generation-job-schema.js";
import { ensureAuditSchema } from "./audit/postgres-audit-schema.js";

const pool = createPostgresPool(readDatabaseUrl());

try {
  await ensureContentSchema(pool);
  await ensureRuntimeSchema(pool);
  await ensureGenerationJobSchema(pool);
  await ensureAuditSchema(pool);
} finally {
  await pool.end();
}

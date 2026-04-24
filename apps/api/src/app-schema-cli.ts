import { createPostgresPool, readDatabaseUrl } from "./content/content-database.js";
import { ensureContentSchema } from "./content/postgres-content-schema.js";
import { ensureRuntimeSchema } from "./runtime/postgres-runtime-schema.js";

const pool = createPostgresPool(readDatabaseUrl());

try {
  await ensureContentSchema(pool);
  await ensureRuntimeSchema(pool);
} finally {
  await pool.end();
}

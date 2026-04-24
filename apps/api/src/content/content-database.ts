import { Pool } from "pg";

export interface DatabaseEnv {
  readonly DATABASE_URL?: string;
}

export function readDatabaseUrl(env: DatabaseEnv = process.env): string {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for PostgreSQL content persistence");
  }

  return env.DATABASE_URL;
}

export function createPostgresPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

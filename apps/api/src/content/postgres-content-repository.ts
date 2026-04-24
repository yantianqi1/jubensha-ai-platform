import type { Pool, PoolClient, QueryResult } from "pg";
import {
  parseScriptPackage,
  type ScriptPackage,
} from "@jubensha/dsl";
import type {
  ContentRepository,
  ScriptPackageRecord,
  ScriptVersionRecord,
} from "./content-repository.js";

interface PackageRow {
  readonly id: string;
  readonly current_draft: unknown;
}

interface VersionRow {
  readonly id: string;
  readonly semver: string;
  readonly state: "released";
  readonly content: unknown;
}

export class PostgresContentRepository implements ContentRepository {
  constructor(private readonly pool: Pool) {}

  async savePackage(record: ScriptPackageRecord): Promise<ScriptPackageRecord> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await upsertPackage(client, record);
      await replaceVersions(client, record);
      await client.query("COMMIT");
      return record;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findPackage(packageId: string): Promise<ScriptPackageRecord | null> {
    const packageResult = await this.pool.query<PackageRow>(
      "SELECT id, current_draft FROM script_packages WHERE id = $1",
      [packageId],
    );
    const packageRow = packageResult.rows[0];

    if (!packageRow) {
      return null;
    }

    const versionResult = await findVersionRowsByPackage(this.pool, packageId);
    return buildPackageRecord(packageRow, versionResult.rows);
  }

  async listPackages(): Promise<readonly ScriptPackageRecord[]> {
    const result = await this.pool.query<PackageRow>(
      `
      SELECT id, current_draft
      FROM script_packages
      ORDER BY created_at ASC, id ASC
      `,
    );

    return Promise.all(
      result.rows.map(async (row) => {
        const versionResult = await findVersionRowsByPackage(this.pool, row.id);
        return buildPackageRecord(row, versionResult.rows);
      }),
    );
  }

  async findVersion(versionId: string): Promise<ScriptVersionRecord | null> {
    const result = await this.pool.query<VersionRow>(
      "SELECT id, semver, state, content FROM script_versions WHERE id = $1",
      [versionId],
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return buildVersionRecord(row);
  }
}

async function upsertPackage(
  client: PoolClient,
  record: ScriptPackageRecord,
): Promise<void> {
  await client.query(
    `
    INSERT INTO script_packages (id, current_draft)
    VALUES ($1, $2::jsonb)
    ON CONFLICT (id) DO UPDATE
    SET current_draft = EXCLUDED.current_draft, updated_at = now()
    `,
    [record.id, JSON.stringify(record.currentDraft.content)],
  );
}

async function replaceVersions(
  client: PoolClient,
  record: ScriptPackageRecord,
): Promise<void> {
  await client.query("DELETE FROM script_versions WHERE package_id = $1", [record.id]);

  for (const version of record.releasedVersions) {
    await insertVersion(client, record.id, version);
  }
}

async function insertVersion(
  client: PoolClient,
  packageId: string,
  version: ScriptVersionRecord,
): Promise<void> {
  await client.query(
    `
    INSERT INTO script_versions (id, package_id, semver, state, content)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [version.id, packageId, version.semver, version.state, JSON.stringify(version.content)],
  );
}

function findVersionRowsByPackage(
  pool: Pool,
  packageId: string,
): Promise<QueryResult<VersionRow>> {
  return pool.query<VersionRow>(
    `
    SELECT id, semver, state, content
    FROM script_versions
    WHERE package_id = $1
    ORDER BY created_at ASC, id ASC
    `,
    [packageId],
  );
}

function buildPackageRecord(
  packageRow: PackageRow,
  versionRows: readonly VersionRow[],
): ScriptPackageRecord {
  return {
    id: packageRow.id,
    currentDraft: {
      content: parseStoredPackage(packageRow.current_draft),
    },
    releasedVersions: versionRows.map(buildVersionRecord),
  };
}

function buildVersionRecord(row: VersionRow): ScriptVersionRecord {
  return {
    id: row.id,
    semver: row.semver,
    state: row.state,
    content: parseStoredPackage(row.content),
  };
}

function parseStoredPackage(value: unknown): ScriptPackage {
  return parseScriptPackage(value);
}

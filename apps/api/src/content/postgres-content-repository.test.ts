import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ContentRepository, ScriptPackageRecord } from "./content-repository.js";
import { PostgresContentRepository } from "./postgres-content-repository.js";
import { ensureContentSchema } from "./postgres-content-schema.js";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

const packageContent = {
  package_code: "fog_harbor",
  title: "雾港失踪案",
  status: "draft" as const,
  roles: [
    {
      role_code: "butler",
      name: "管家",
      public_profile: "沉默的宅邸管家。",
    },
  ],
  clues: [],
  scenes: [
    {
      scene_code: "act1",
      phase: "investigation" as const,
      visible_to: [{ kind: "public" as const, value: "all" }],
      actions: [],
      end_if: [{ op: "timer_expired" as const }],
      entry_if: [],
      win_rule_hooks: [],
    },
  ],
};

describeDatabase("PostgresContentRepository", () => {
  let pool: Pool;
  let repository: ContentRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await ensureContentSchema(pool);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE script_versions, script_packages");
    repository = new PostgresContentRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("saves and loads a draft package", async () => {
    const record: ScriptPackageRecord = {
      id: "pkg_test_1",
      currentDraft: { content: packageContent },
      releasedVersions: [],
    };

    await repository.savePackage(record);

    await expect(repository.findPackage(record.id)).resolves.toEqual(record);
  });

  it("lists packages in creation order", async () => {
    const first: ScriptPackageRecord = {
      id: "pkg_test_1",
      currentDraft: { content: packageContent },
      releasedVersions: [],
    };
    const second: ScriptPackageRecord = {
      id: "pkg_test_2",
      currentDraft: {
        content: { ...packageContent, package_code: "fog_harbor_2" },
      },
      releasedVersions: [],
    };

    await repository.savePackage(first);
    await repository.savePackage(second);

    await expect(repository.listPackages()).resolves.toEqual([first, second]);
  });

  it("saves and loads released versions", async () => {
    const record: ScriptPackageRecord = {
      id: "pkg_test_2",
      currentDraft: { content: packageContent },
      releasedVersions: [
        {
          id: "ver_test_1",
          semver: "1.0.0",
          state: "released",
          content: {
            ...packageContent,
            status: "released",
            semver: "1.0.0",
          },
        },
      ],
    };

    await repository.savePackage(record);

    await expect(repository.findVersion("ver_test_1")).resolves.toEqual(
      record.releasedVersions[0],
    );
    await expect(repository.findPackage(record.id)).resolves.toEqual(record);
  });

  it("returns null for missing package and version", async () => {
    await expect(repository.findPackage("pkg_missing")).resolves.toBeNull();
    await expect(repository.findVersion("ver_missing")).resolves.toBeNull();
  });
});

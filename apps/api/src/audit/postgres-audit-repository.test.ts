import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ensureAuditSchema } from "./postgres-audit-schema.js";
import { PostgresAuditRepository } from "./postgres-audit-repository.js";

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

describeWithDatabase("PostgresAuditRepository", () => {
  beforeEach(async () => {
    if (!pool) {
      return;
    }

    await ensureAuditSchema(pool);
    await pool.query("DELETE FROM audit_events");
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("stores and lists audit events", async () => {
    if (!pool) {
      throw new Error("DATABASE_URL is required for this test");
    }

    const repository = new PostgresAuditRepository(pool);

    await repository.saveEvent({
      id: "audit_1",
      action: "publish_draft",
      actor: { actorId: "operator_1", actorType: "operator" },
      targetType: "package",
      targetId: "pkg_1",
      status: "succeeded",
      createdAt: "2026-04-25T00:00:00.000Z",
    });

    await expect(repository.listEvents({ targetType: "package", targetId: "pkg_1" })).resolves.toEqual([
      expect.objectContaining({ id: "audit_1", action: "publish_draft" }),
    ]);
  });
});

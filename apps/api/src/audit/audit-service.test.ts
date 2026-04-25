import { describe, expect, it } from "vitest";
import { AuditService } from "./audit-service.js";
import { InMemoryAuditRepository } from "./audit-repository.js";

describe("AuditService", () => {
  it("records and lists audit events", async () => {
    const service = new AuditService({
      repository: new InMemoryAuditRepository(),
      idGenerator: () => "audit_1",
      now: () => "2026-04-25T00:00:00.000Z",
    });

    const event = await service.record({
      action: "publish_draft",
      actor: { actorId: "operator_1", actorType: "operator" },
      targetType: "package",
      targetId: "pkg_1",
      status: "succeeded",
    });

    expect(event).toMatchObject({ id: "audit_1", action: "publish_draft", targetId: "pkg_1" });
    await expect(service.listEvents({ targetType: "package", targetId: "pkg_1" })).resolves.toEqual([event]);
  });
});

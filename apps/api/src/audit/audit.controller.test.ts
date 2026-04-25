import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AuditController } from "./audit.controller.js";
import { AuditService } from "./audit-service.js";
import { InMemoryAuditRepository } from "./audit-repository.js";

describe("AuditController", () => {
  it("exposes audit event route metadata", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditController)).toBe("audit");
    expect(Reflect.getMetadata(PATH_METADATA, AuditController.prototype.listEvents)).toBe("events");
    expect(Reflect.getMetadata(METHOD_METADATA, AuditController.prototype.listEvents)).toBe(RequestMethod.GET);
  });

  it("lists target-scoped audit events", async () => {
    const { controller, service } = createController();
    await service.record({
      action: "publish_draft",
      actor: { actorId: "operator_1", actorType: "operator" },
      targetType: "package",
      targetId: "pkg_1",
      status: "succeeded",
    });

    await expect(controller.listEvents("package", "pkg_1")).resolves.toEqual([
      expect.objectContaining({ action: "publish_draft", targetId: "pkg_1" }),
    ]);
  });
});

function createController(): { readonly controller: AuditController; readonly service: AuditService } {
  const service = new AuditService({
    repository: new InMemoryAuditRepository(),
    idGenerator: () => "audit_1",
    now: () => "2026-04-25T00:00:00.000Z",
  });

  return { controller: new AuditController(service), service };
}

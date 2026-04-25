import { Controller, Get, Query } from "@nestjs/common";
import { AuditService } from "./audit-service.js";

@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("events")
  listEvents(
    @Query("targetType") targetType?: string,
    @Query("targetId") targetId?: string,
  ) {
    return this.auditService.listEvents({
      ...(targetType ? { targetType } : {}),
      ...(targetId ? { targetId } : {}),
    });
  }
}

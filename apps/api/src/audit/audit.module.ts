import { Global, Module } from "@nestjs/common";
import { createPostgresPool, readDatabaseUrl } from "../content/content-database.js";
import { AuditController } from "./audit.controller.js";
import { AuditService } from "./audit-service.js";
import type { AuditRepository } from "./audit-repository.js";
import { PostgresAuditRepository } from "./postgres-audit-repository.js";
import { AUDIT_ID_GENERATOR, AUDIT_REPOSITORY } from "./audit.tokens.js";

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    {
      provide: AUDIT_REPOSITORY,
      useFactory: () => new PostgresAuditRepository(createPostgresPool(readDatabaseUrl())),
    },
    {
      provide: AUDIT_ID_GENERATOR,
      useFactory: () => () => `audit_${crypto.randomUUID()}`,
    },
    {
      provide: AuditService,
      inject: [AUDIT_REPOSITORY, AUDIT_ID_GENERATOR],
      useFactory: (repository: AuditRepository, idGenerator: () => string) =>
        new AuditService({ repository, idGenerator, now: () => new Date().toISOString() }),
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}

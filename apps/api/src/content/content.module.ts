import { Module } from "@nestjs/common";
import type { Pool } from "pg";
import { ContentController } from "./content.controller.js";
import {
  createPostgresPool,
  readDatabaseUrl,
} from "./content-database.js";
import type { ContentRepository } from "./content-repository.js";
import { ContentService } from "./content-service.js";
import {
  createRandomContentIdGenerator,
  type ContentIdGenerator,
} from "./content-id-generator.js";
import { PostgresContentRepository } from "./postgres-content-repository.js";
import { PublishGate } from "./publish-gate.js";
import {
  CONTENT_ID_GENERATOR,
  CONTENT_REPOSITORY,
  DATABASE_POOL,
} from "./content.tokens.js";

@Module({
  controllers: [ContentController],
  providers: [
    PublishGate,
    {
      provide: DATABASE_POOL,
      useFactory: () => createPostgresPool(readDatabaseUrl()),
    },
    {
      provide: CONTENT_REPOSITORY,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new PostgresContentRepository(pool),
    },
    {
      provide: CONTENT_ID_GENERATOR,
      useFactory: createRandomContentIdGenerator,
    },
    {
      provide: ContentService,
      inject: [CONTENT_REPOSITORY, CONTENT_ID_GENERATOR, PublishGate],
      useFactory: (
        repository: ContentRepository,
        idGenerator: ContentIdGenerator,
        publishGate: PublishGate,
      ) =>
        new ContentService({
          repository,
          idGenerator,
          publishGate,
        }),
    },
  ],
  exports: [ContentService, DATABASE_POOL],
})
export class ContentModule {}

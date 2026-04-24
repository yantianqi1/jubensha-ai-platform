import type { Pool } from "pg";
import { Module } from "@nestjs/common";
import { DATABASE_POOL } from "../content/content.tokens.js";
import { ContentModule } from "../content/content.module.js";
import { ContentService } from "../content/content-service.js";
import { PostgresRuntimeRepository } from "./postgres-runtime-repository.js";
import { RuntimeController } from "./runtime.controller.js";
import {
  createRandomRuntimeIdGenerator,
  type RuntimeIdGenerator,
} from "./runtime-id-generator.js";
import type { RuntimeRepository } from "./runtime-repository.js";
import { RuntimeService, type RuntimeVersionReader } from "./runtime-service.js";
import {
  RUNTIME_ID_GENERATOR,
  RUNTIME_REPOSITORY,
  RUNTIME_VERSION_READER,
} from "./runtime.tokens.js";

@Module({
  imports: [ContentModule],
  controllers: [RuntimeController],
  providers: [
    {
      provide: RUNTIME_REPOSITORY,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new PostgresRuntimeRepository(pool),
    },
    {
      provide: RUNTIME_ID_GENERATOR,
      useFactory: createRandomRuntimeIdGenerator,
    },
    {
      provide: RUNTIME_VERSION_READER,
      useExisting: ContentService,
    },
    {
      provide: RuntimeService,
      inject: [RUNTIME_REPOSITORY, RUNTIME_ID_GENERATOR, RUNTIME_VERSION_READER],
      useFactory: (
        repository: RuntimeRepository,
        idGenerator: RuntimeIdGenerator,
        versionReader: RuntimeVersionReader,
      ) => new RuntimeService({ repository, idGenerator, versionReader }),
    },
  ],
  exports: [RuntimeService],
})
export class RuntimeModule {}

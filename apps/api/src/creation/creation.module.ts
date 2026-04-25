import { Module } from "@nestjs/common";
import type { Pool } from "pg";
import { ContentModule } from "../content/content.module.js";
import { DATABASE_POOL } from "../content/content.tokens.js";
import { ContentService } from "../content/content-service.js";
import { createCreationModelProviderFromEnv, type CreationModelProvider } from "./creation-model-provider.js";
import { CreationOrchestrator } from "./creation-orchestrator.js";
import { CreationController } from "./creation.controller.js";
import { CreationService } from "./creation-service.js";
import { QualityGate } from "./quality-gate.js";
import { PublishReviewController } from "./publish-review.controller.js";
import { ReviewWorkbenchController } from "./review-workbench.controller.js";
import { StoryCriticAgent } from "./story-critic-agent.js";
import { StoryPlannerAgent } from "./story-planner-agent.js";
import { ThemeAssetsController } from "./theme-assets.controller.js";
import { ThemeAssetJobController } from "./theme-asset-job.controller.js";
import { ThemeAssetJobExecutor, ThemeAssetJobStore } from "./theme-asset-job.js";
import { GenerationJobService, type GenerationJobRepository } from "./generation-job.js";
import { PostgresGenerationJobRepository } from "./postgres-generation-job-repository.js";
import { ScriptCreationPipeline } from "./script-creation-pipeline.js";
import { THEME_ASSET_PROVIDER, createThemeAssetProviderFromEnv } from "./theme-asset-provider.js";

const CREATION_MODEL_PROVIDER = Symbol("CREATION_MODEL_PROVIDER");
const CREATION_MAX_ATTEMPTS = 2;
const GENERATION_JOB_REPOSITORY = Symbol("GENERATION_JOB_REPOSITORY");

@Module({
  imports: [ContentModule],
  controllers: [
    CreationController,
    ReviewWorkbenchController,
    PublishReviewController,
    ThemeAssetsController,
    ThemeAssetJobController,
  ],
  providers: [
    QualityGate,
    ThemeAssetJobStore,
    ThemeAssetJobExecutor,
    {
      provide: THEME_ASSET_PROVIDER,
      useFactory: () => createThemeAssetProviderFromEnv(process.env),
    },
    {
      provide: GENERATION_JOB_REPOSITORY,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new PostgresGenerationJobRepository(pool),
    },
    {
      provide: CREATION_MODEL_PROVIDER,
      useFactory: () => createCreationModelProviderFromEnv(process.env),
    },
    {
      provide: StoryPlannerAgent,
      inject: [CREATION_MODEL_PROVIDER],
      useFactory: (provider: CreationModelProvider) => new StoryPlannerAgent({ provider }),
    },
    {
      provide: StoryCriticAgent,
      inject: [CREATION_MODEL_PROVIDER],
      useFactory: (provider: CreationModelProvider) => new StoryCriticAgent({ provider }),
    },
    {
      provide: CreationOrchestrator,
      inject: [StoryPlannerAgent, StoryCriticAgent],
      useFactory: (planner: StoryPlannerAgent, critic: StoryCriticAgent) =>
        new CreationOrchestrator({ planner, critic, maxAttempts: CREATION_MAX_ATTEMPTS }),
    },
    {
      provide: GenerationJobService,
      inject: [GENERATION_JOB_REPOSITORY, CreationOrchestrator, ContentService],
      useFactory: (
        repository: GenerationJobRepository,
        orchestrator: CreationOrchestrator,
        contentService: ContentService,
      ) =>
        new GenerationJobService({
          repository,
          pipeline: new ScriptCreationPipeline({ orchestrator }),
          draftWriter: contentService,
          idGenerator: () => `generation_job_${crypto.randomUUID()}`,
          now: () => new Date().toISOString(),
        }),
    },
    {
      provide: CreationService,
      inject: [ContentService],
      useFactory: (contentService: ContentService) =>
        new CreationService({ draftWriter: contentService }),
    },
  ],
})
export class CreationModule {}

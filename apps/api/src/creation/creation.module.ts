import { Module } from "@nestjs/common";
import { ContentModule } from "../content/content.module.js";
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
import { THEME_ASSET_PROVIDER, UnconfiguredThemeAssetProvider } from "./theme-asset-provider.js";

const CREATION_MODEL_PROVIDER = Symbol("CREATION_MODEL_PROVIDER");
const CREATION_MAX_ATTEMPTS = 2;

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
    { provide: THEME_ASSET_PROVIDER, useClass: UnconfiguredThemeAssetProvider },
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
      provide: CreationService,
      inject: [ContentService],
      useFactory: (contentService: ContentService) =>
        new CreationService({ draftWriter: contentService }),
    },
  ],
})
export class CreationModule {}

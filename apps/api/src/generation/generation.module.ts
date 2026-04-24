import { Module } from "@nestjs/common";
import { ContentModule } from "../content/content.module.js";
import { ContentService } from "../content/content-service.js";
import { RuntimeModule } from "../runtime/runtime.module.js";
import { RuntimeService } from "../runtime/runtime-service.js";
import { GenerationController } from "./generation.controller.js";
import { GenerationService } from "./generation-service.js";
import type { ModelProvider } from "./model-provider.js";
import { MODEL_PROVIDER } from "./generation.tokens.js";

class UnconfiguredModelProvider implements ModelProvider {
  async completeJson(): Promise<string> {
    throw new Error("Model provider is not configured");
  }
}

@Module({
  imports: [ContentModule, RuntimeModule],
  controllers: [GenerationController],
  providers: [
    {
      provide: MODEL_PROVIDER,
      useFactory: () => new UnconfiguredModelProvider(),
    },
    {
      provide: GenerationService,
      inject: [RuntimeService, ContentService, MODEL_PROVIDER],
      useFactory: (
        runtimeReader: RuntimeService,
        versionReader: ContentService,
        modelProvider: ModelProvider,
      ) => new GenerationService({ runtimeReader, versionReader, modelProvider }),
    },
  ],
  exports: [GenerationService],
})
export class GenerationModule {}

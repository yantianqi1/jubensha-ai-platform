import { Module } from "@nestjs/common";
import { ContentModule } from "./content/content.module.js";
import { DemoController } from "./demo/demo.controller.js";
import { GenerationModule } from "./generation/generation.module.js";
import { HealthController } from "./health/health.controller.js";
import { HomeController } from "./home/home.controller.js";
import { RuntimeModule } from "./runtime/runtime.module.js";

@Module({
  imports: [ContentModule, RuntimeModule, GenerationModule],
  controllers: [HealthController, HomeController, DemoController],
})
export class AppModule {}

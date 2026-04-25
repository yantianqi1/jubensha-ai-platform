import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditModule } from "./audit/audit.module.js";
import { ContentModule } from "./content/content.module.js";
import { CreationModule } from "./creation/creation.module.js";
import { DemoController } from "./demo/demo.controller.js";
import { GenerationModule } from "./generation/generation.module.js";
import { HealthController } from "./health/health.controller.js";
import { HomeController } from "./home/home.controller.js";
import { RequestLoggingInterceptor } from "./request-logging.interceptor.js";
import { RuntimeModule } from "./runtime/runtime.module.js";
import { WebStaticController } from "./web-static/web-static.controller.js";

@Module({
  imports: [AuditModule, ContentModule, RuntimeModule, GenerationModule, CreationModule],
  controllers: [HealthController, HomeController, DemoController, WebStaticController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}

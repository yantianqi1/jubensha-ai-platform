import { loadEnv } from "./load-env.js";

loadEnv();
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { readApiPort, readCorsOrigins } from "./app-config.js";
import { AppModule } from "./app.module.js";
import { readWebDistPath } from "./web-static/web-static-page.js";

await bootstrap();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(readWebDistPath(), { index: false });
  app.enableCors({
    origin: readCorsOrigins(),
  });
  await app.listen(readApiPort());
}

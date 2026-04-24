import { loadEnv } from "./load-env.js";

loadEnv();
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { readApiPort, readCorsOrigins } from "./app-config.js";
import { AppModule } from "./app.module.js";

await bootstrap();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: readCorsOrigins(),
  });
  await app.listen(readApiPort());
}

import { loadEnv } from "./load-env.js";

loadEnv();
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const DEFAULT_API_PORT = 3001;

await bootstrap();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: readCorsOrigins(),
  });
  await app.listen(readApiPort());
}

function readApiPort(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.API_PORT;

  if (!value) {
    return DEFAULT_API_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("API_PORT must be a positive integer");
  }

  return port;
}

function readCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const value = env.CORS_ORIGINS ?? env.NEXT_PUBLIC_API_BASE;

  if (!value) {
    return ["http://localhost:3000", "http://localhost:3001"];
  }

  return value.split(",").map((origin) => origin.trim());
}

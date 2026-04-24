import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

const ENV_PATHS = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];

export function loadEnv(): void {
  const envPath = ENV_PATHS.find((path) => existsSync(path));

  if (!envPath) {
    return;
  }

  config({ path: envPath });
}

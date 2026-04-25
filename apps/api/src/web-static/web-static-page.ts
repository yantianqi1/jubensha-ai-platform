import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type WebStaticSurface = "studio" | "play" | "admin";

const WEB_DIST_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../../web/dist");

export function readWebDistPath(): string {
  return WEB_DIST_PATH;
}

export function readWebStaticPage(surface: WebStaticSurface): Promise<string> {
  return readFile(resolve(WEB_DIST_PATH, surface, "index.html"), "utf8");
}

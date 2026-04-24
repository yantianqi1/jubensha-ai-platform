import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDemoPage } from "../dist/assets/main.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

await mkdir(dist, { recursive: true });
await writeFile(resolve(dist, "index.html"), renderDemoPage(), "utf8");
await writeFile(resolve(dist, "app.js"), "document.documentElement.dataset.hydrated = 'true';\n", "utf8");
await copyFile(resolve(root, "src/styles.css"), resolve(dist, "styles.css"));

import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

await mkdir(dist, { recursive: true });
await bundleBrowserApp(root, dist);
await copyFile(resolve(root, "src/styles.css"), resolve(dist, "styles.css"));
await writeFile(resolve(dist, "index.html"), await renderTemplate(root), "utf8");

async function bundleBrowserApp(rootDir, distDir) {
  await build({
    entryPoints: [resolve(rootDir, "src/browser-app.ts")],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    outfile: resolve(distDir, "app.js"),
  });
}

async function renderTemplate(rootDir) {
  const { renderDemoPage } = await import(resolve(rootDir, "dist/assets/main.js"));
  return renderDemoPage();
}

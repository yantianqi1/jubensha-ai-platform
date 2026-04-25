import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

await mkdir(dist, { recursive: true });
await bundleBrowserApp(root, dist);
await copyFile(resolve(root, "src/styles.css"), resolve(dist, "styles.css"));
await copyFile(resolve(root, "src/script-creation-job.css"), resolve(dist, "script-creation-job.css"));
await writeStaticPages(root, dist);

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

async function writeStaticPages(rootDir, distDir) {
  const { renderDemoPage } = await import(resolve(rootDir, "dist/assets/main.js"));
  const pages = [
    { dir: ".", surface: "play-web" },
    { dir: "play", surface: "play-web" },
    { dir: "studio", surface: "studio-web" },
    { dir: "admin", surface: "admin-web" },
  ];

  for (const page of pages) {
    const pageDir = resolve(distDir, page.dir);
    await mkdir(pageDir, { recursive: true });
    await writeFile(resolve(pageDir, "index.html"), renderDemoPage(page.surface), "utf8");
  }
}

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SceneSchema } from "../src/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../schema/scene.schema.json");

const jsonSchema = zodToJsonSchema(SceneSchema, {
  name: "Scene",
  $refStrategy: "none",
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + "\n", "utf8");

console.log(`[dsl] JSON Schema written to ${outPath}`);

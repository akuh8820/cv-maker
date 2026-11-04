// Jalankan semua check di tests/e2e/checks/*.mjs. Tiap file mengekspor
// { name, run({ browser, url }) } dan melempar Error bila gagal.
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./helpers.mjs";
import { startServer } from "./server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const checksDir = join(here, "checks");

const only = process.argv[2];
const files = readdirSync(checksDir)
  .filter((f) => f.endsWith(".mjs"))
  .filter((f) => !only || f.includes(only))
  .sort();

const server = await startServer(root);
const browser = await launch();
let failed = 0;

for (const file of files) {
  const mod = await import(join(checksDir, file));
  const label = mod.name || file;
  try {
    await mod.run({ browser, url: server.url });
    console.log(`ok   ${label}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${label}: ${err.message}`);
  }
}

await browser.close();
await server.close();
process.exit(failed ? 1 : 0);

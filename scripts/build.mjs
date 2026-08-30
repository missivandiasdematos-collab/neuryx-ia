import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "vite";

const isCi = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const outDir =
  process.env.NEURYX_BUILD_OUTDIR ??
  (isCi ? path.resolve("dist") : path.join(tmpdir(), "neuryx-ia-dist"));

await rm(outDir, { force: true, recursive: true });

await build({
  build: {
    emptyOutDir: true,
    outDir,
  },
  configLoader: "native",
});

console.log(`Build gerado em: ${outDir}`);

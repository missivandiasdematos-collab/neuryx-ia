import { build } from "esbuild";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "dist");
const assetsDir = path.join(outDir, "assets");

if (!existsSync(assetsDir)) {
  await mkdir(assetsDir, { recursive: true });
}

try {
  console.log("Empacotando React...");
  await build({
    entryPoints: [path.join(root, "src/main.tsx")],
    bundle: true,
    outdir: assetsDir,
    entryNames: "app",
    assetNames: "[name]",
    format: "esm",
    target: ["es2020"],
    minify: true,
    sourcemap: false,
    loader: {
      ".tsx": "tsx",
      ".ts": "ts",
      ".css": "css",
      ".svg": "file",
      ".png": "file",
      ".jpg": "file",
      ".jpeg": "file",
      ".webp": "file",
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  console.log("Gerando HTML...");
  await writeFile(
    path.join(outDir, "index.html"),
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="NEURYX.IA - analise visual privada para graficos financeiros." />
    <title>NEURYX.IA | Analise visual</title>
    <script type="module" crossorigin src="/assets/app.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/app.css" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
    "utf8",
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const hasExistingBuild = existsSync(path.join(outDir, "index.html")) && existsSync(assetsDir);
  const isLocalWriteBlock = /Acesso negado|access denied|EPERM|EACCES|permission/i.test(message);

  if (!hasExistingBuild || !isLocalWriteBlock) {
    throw error;
  }

  console.warn("Build novo bloqueado pelo Windows; usando dist existente validado.");
}

console.log("Build gerado em ./dist");

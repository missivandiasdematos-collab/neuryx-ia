import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const owner = "missivandiasdematos-collab";
const repo = "neuryx-ia";
const branch = "main";
const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
const ignoredDirs = new Set([".git", "node_modules", "dist", ".next", ".vite"]);
const ignoredFiles = new Set(["tsconfig.tsbuildinfo", "scripts/publish-github.mjs"]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function collectFiles(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name) || ignoredFiles.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...collectFiles(fullPath, relativePath));
    if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

async function githubApi(endpoint, init = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${endpoint} -> ${response.status}: ${text}`);
  return body;
}

const ref = await githubApi(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
const parentSha = ref.object.sha;
const parentCommit = await githubApi(`/repos/${owner}/${repo}/git/commits/${parentSha}`);
const files = collectFiles(process.cwd()).sort();
const tree = [];

for (const file of files) {
  const content = readFileSync(path.join(process.cwd(), file), "utf8");
  const blob = await githubApi(`/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "utf-8" }),
  });
  tree.push({ path: toPosix(file), mode: "100644", type: "blob", sha: blob.sha });
}

const nextTree = await githubApi(`/repos/${owner}/${repo}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree }),
});
const nextCommit = await githubApi(`/repos/${owner}/${repo}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message: "Document real static app status",
    parents: [parentSha],
    tree: nextTree.sha,
  }),
});

await githubApi(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
  method: "PATCH",
  body: JSON.stringify({ sha: nextCommit.sha, force: false }),
});

console.log(`Publicado commit ${nextCommit.sha}`);
console.log(`Arquivos enviados: ${files.length}`);

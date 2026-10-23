#!/usr/bin/env node
// Serves a local release feed so Cove's built-in updater can be exercised end to end before a newer
// real release exists. It packages a locally published Cove + Cove.InstanceManager exactly like the
// release workflow, writes cove-release.json with scripts/generate-release-manifest.mjs, and serves
// both on loopback (plain HTTP is allowed only for loopback feeds).
//
//   node scripts/fake-update-feed.mjs --publish-dir /tmp/cove-v2 --version 1.99.0 [--rid linux-x64]
//     [--channel stable|nightly] [--port 5999] [--bad-checksum]
//
// Then start the older Cove with:
//   Cove__Updates__FeedBaseUrl=http://127.0.0.1:5999
//   Cove__Updates__ApiBaseUrl=http://127.0.0.1:5999/api   (unused while a manifest exists; avoids GitHub)
//
// See the PR for #29 ("How to test locally") for the full walkthrough.

import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest, describeAssets, listMigrations } from "./generate-release-manifest.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { port: "5999", channel: "stable", rid: defaultRid() };
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (key === "--bad-checksum") {
      options["bad-checksum"] = true;
      continue;
    }
    if (!key.startsWith("--") || argv[index + 1] === undefined) throw new Error(`Unexpected argument: ${key}`);
    options[key.slice(2)] = argv[++index];
  }
  if (!options["publish-dir"] || !options.version) {
    throw new Error("Usage: fake-update-feed.mjs --publish-dir <dir> --version <x.y.z> [--rid] [--channel] [--port]");
  }
  return options;
}

function defaultRid() {
  const os = { win32: "win", darwin: "osx", linux: "linux" }[process.platform] ?? process.platform;
  return `${os}-${process.arch === "arm64" ? "arm64" : "x64"}`;
}

function packageArchive(publishDir, rid, outputDir) {
  const windows = rid.startsWith("win");
  const files = windows ? ["Cove.exe", "Cove.InstanceManager.exe"] : ["Cove", "Cove.InstanceManager"];
  for (const file of files) {
    if (!existsSync(join(publishDir, file))) throw new Error(`Missing ${join(publishDir, file)}`);
  }
  const archive = join(outputDir, windows ? `cove-${rid}.zip` : `cove-${rid}.tar.gz`);
  // Same layout as release.yml: the two executables at the archive root, nothing else.
  // Windows 10+ ships bsdtar, which writes a zip with -a and a .zip name.
  execFileSync("tar", [windows ? "-a" : "-z", "-c", "-f", archive, "-C", publishDir, ...files], { stdio: "inherit" });
  return archive;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const workDir = mkdtempSync(join(tmpdir(), "cove-fake-feed-"));
  const assetsDir = join(workDir, "assets");
  mkdirSync(assetsDir);
  const archive = packageArchive(options["publish-dir"], options.rid, assetsDir);

  const tag = options.channel === "nightly" ? "nightly" : `v${options.version}`;
  const assets = describeAssets(assetsDir).map((asset) =>
    options["bad-checksum"] ? { ...asset, sha256: "0".repeat(64) } : asset,
  );
  const manifest = buildManifest({
    version: options.version,
    channel: options.channel,
    publishedAt: new Date().toISOString(),
    notesUrl: `http://127.0.0.1:${options.port}/releases/tag/${tag}`,
    notesMarkdown:
      options.notes ??
      `## [${options.version}] - local simulation\n\n- Served by \`scripts/fake-update-feed.mjs\`.\n- **Markdown** renders; <b>raw HTML</b> does not.`,
    assets,
    migrations: listMigrations(options["migrations-dir"] ?? join(repoRoot, "src", "Cove.Data", "Migrations")),
  });
  const manifestPath = join(assetsDir, "cove-release.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  for (const asset of assets) writeFileSync(join(assetsDir, `${asset.name}.sha256`), `${asset.sha256}  ${asset.name}\n`);

  const routes = new Map([
    [
      options.channel === "nightly"
        ? "/releases/download/nightly/cove-release.json"
        : "/releases/latest/download/cove-release.json",
      manifestPath,
    ],
    ...assets.flatMap((asset) => [
      [`/releases/download/${tag}/${asset.name}`, join(assetsDir, asset.name)],
      [`/releases/download/${tag}/${asset.name}.sha256`, join(assetsDir, `${asset.name}.sha256`)],
    ]),
  ]);

  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const file = routes.get(path);
    console.log(`${new Date().toISOString()} ${request.method} ${path} -> ${file ? 200 : 404}`);
    if (!file || request.method !== "GET") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": file.endsWith(".json") ? "application/json" : "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  });

  server.listen(Number(options.port), "127.0.0.1", () => {
    console.log(`Serving Cove ${options.version} (${options.channel}, ${options.rid}) from ${workDir}`);
    console.log(`  archive: ${archive}`);
    console.log(`  Cove__Updates__FeedBaseUrl=http://127.0.0.1:${options.port}`);
    console.log(`  Cove__Updates__ApiBaseUrl=http://127.0.0.1:${options.port}/api`);
  });
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

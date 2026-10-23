#!/usr/bin/env node
// Writes cove-release.json, the manifest Cove's updater reads (src/Cove.Api/Updates/UpdateModels.cs).
//
//   node scripts/generate-release-manifest.mjs --version 1.5.0 --channel stable \
//     --assets-dir release-files --migrations-dir src/Cove.Data/Migrations \
//     [--changelog CHANGELOG.md | --notes-file notes.md] [--notes-url URL] [--output release-files/cove-release.json]
//
// Used by release.yml and nightly.yml, and by scripts/fake-update-feed.mjs for local simulation.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const ARCHIVE = /^cove-((?:win|linux|osx|linux-musl)-(?:x64|arm64|x86|arm))\.(?:zip|tar\.gz)$/;

/** The CHANGELOG.md section for one version, matching release.yml's awk extraction. */
export function extractChangelogEntry(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## ["));
  return lines
    .slice(start, end < 0 ? undefined : end)
    .join("\n")
    .trim();
}

/** EF migration IDs are the migration file names (src/Cove.Tests/UpdatesConfigTests.cs pins this). */
export function listMigrations(migrationsDir) {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".cs") && !name.endsWith(".Designer.cs") && !name.endsWith("ModelSnapshot.cs"))
    .map((name) => basename(name, ".cs"))
    .sort();
}

export function describeAssets(assetsDir) {
  return readdirSync(assetsDir)
    .map((name) => ({ name, match: ARCHIVE.exec(name) }))
    .filter(({ match }) => match)
    .map(({ name, match }) => {
      const path = join(assetsDir, name);
      return {
        rid: match[1],
        name,
        size: statSync(path).size,
        sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
      };
    })
    .sort((left, right) => left.rid.localeCompare(right.rid));
}

export function buildManifest({ version, channel, publishedAt, notesUrl, notesMarkdown, assets, migrations }) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Not a release version: ${version}`);
  }
  if (assets.length === 0) throw new Error("No native release archives were found.");
  return {
    schemaVersion: 1,
    version,
    channel,
    publishedAt,
    notesUrl: notesUrl || null,
    notesMarkdown: notesMarkdown || null,
    assets,
    migrations,
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key?.startsWith("--") || argv[index + 1] === undefined) throw new Error(`Unexpected argument: ${key}`);
    options[key.slice(2)] = argv[index + 1];
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  for (const required of ["version", "channel", "assets-dir", "migrations-dir"]) {
    if (!options[required]) throw new Error(`--${required} is required`);
  }
  const notesMarkdown = options["notes-file"]
    ? readFileSync(options["notes-file"], "utf8").trim()
    : options.changelog
      ? extractChangelogEntry(readFileSync(options.changelog, "utf8"), options.version)
      : null;
  const manifest = buildManifest({
    version: options.version,
    channel: options.channel,
    publishedAt: options["published-at"] ?? new Date().toISOString(),
    notesUrl: options["notes-url"],
    notesMarkdown,
    assets: describeAssets(options["assets-dir"]),
    migrations: listMigrations(options["migrations-dir"]),
  });
  const output = options.output ?? join(options["assets-dir"], "cove-release.json");
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${output}: ${manifest.version} with ${manifest.assets.length} assets and ${manifest.migrations.length} migrations`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

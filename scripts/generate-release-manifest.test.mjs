import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildManifest, describeAssets, extractChangelogEntry, listMigrations } from "./generate-release-manifest.mjs";

test("extracts one changelog section like release.yml", () => {
  const changelog = "# Changelog\n\n## [1.5.0] - 2026-10-01\n- New\n\n## [1.4.1] - 2026-09-01\n- Old\n";
  assert.equal(extractChangelogEntry(changelog, "1.5.0"), "## [1.5.0] - 2026-10-01\n- New");
  assert.equal(extractChangelogEntry(changelog, "1.4.1"), "## [1.4.1] - 2026-09-01\n- Old");
  assert.equal(extractChangelogEntry(changelog, "9.9.9"), null);
});

test("describes only native archives and lists migrations by file name", () => {
  const root = mkdtempSync(join(tmpdir(), "cove-manifest-"));
  try {
    const assets = join(root, "assets");
    const migrations = join(root, "migrations");
    mkdirSync(assets);
    mkdirSync(migrations);
    writeFileSync(join(assets, "cove-linux-x64.tar.gz"), "abc");
    writeFileSync(join(assets, "cove-linux-x64.tar.gz.sha256"), "x");
    writeFileSync(join(assets, "cove-cli-linux-x64.tar.gz"), "x");
    writeFileSync(join(assets, "checksums.txt"), "x");
    for (const name of ["20260101_A.cs", "20260101_A.Designer.cs", "20260202_B.cs", "CoveContextModelSnapshot.cs"]) {
      writeFileSync(join(migrations, name), "");
    }

    assert.deepEqual(describeAssets(assets), [
      {
        rid: "linux-x64",
        name: "cove-linux-x64.tar.gz",
        size: 3,
        sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      },
    ]);
    assert.deepEqual(listMigrations(migrations), ["20260101_A", "20260202_B"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects invalid versions and empty asset lists", () => {
  const base = { channel: "stable", publishedAt: "now", assets: [{ rid: "linux-x64" }], migrations: [] };
  assert.throws(() => buildManifest({ ...base, version: "v1.5.0" }));
  assert.throws(() => buildManifest({ ...base, version: "1.5.0", assets: [] }));
  assert.equal(buildManifest({ ...base, version: "1.5.1-dev.3" }).version, "1.5.1-dev.3");
});

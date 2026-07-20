// @ts-nocheck — this check drives a Node child process (esbuild) and the fs/path/child_process
// builtins, whose types are outside the browser-targeted app tsconfig. It runs under Vitest, which
// executes it in Node; the runtime assertions below are the source of truth for the invariant.
// Cross-bundle sharing check for the additive runtime/v2. Unlike an in-process simulation, this
// builds the extension fixture as a genuinely SEPARATE bundle (esbuild, shared modules external),
// then loads it with those externals provided by the host — the analogue of the browser resolving
// the bundle's bare imports through the runtime import-map. It proves the real invariant: the
// externalized extension shares the host's single React and the host QueryClient, and never bundles
// its own second copy.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const here = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(here, "../../..");
const fixtureEntry = path.join(here, "fixtures", "v2CrossBundleExtension.tsx");
const artifactPath = path.join(here, ".crossbundle-artifact.mjs");

// The host-provided shared modules an extension build must externalize (v1 set + the v2 SDK).
const EXTERNAL_SHARED_MODULES = [
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "@tanstack/react-query",
  "lucide-react",
  "@cove/extension-sdk",
];

let bundleSource = "";

beforeAll(async () => {
  // Build the fixture as a separate bundle in a clean Node process (esbuild cannot run in the jsdom
  // test environment). The shared modules stay external, mirroring a real extension build.
  const buildScript = `
import { build } from "esbuild";
await build({
  entryPoints: [${JSON.stringify(fixtureEntry)}],
  outfile: ${JSON.stringify(artifactPath)},
  bundle: true,
  format: "esm",
  platform: "browser",
  external: ${JSON.stringify(EXTERNAL_SHARED_MODULES)},
  logLevel: "silent",
});
`;
  execFileSync(process.execPath, ["--input-type=module", "-e", buildScript], { cwd: uiRoot });
  bundleSource = await fs.readFile(artifactPath, "utf8");
});

afterAll(async () => {
  await fs.rm(artifactPath, { force: true });
});

describe("runtime/v2 cross-bundle sharing", () => {
  it("keeps react, react-query and the SDK external in the separately-built extension bundle", () => {
    // They must survive as bare imports so the import-map redirects them to the single host copy.
    expect(bundleSource).toMatch(/from\s*"react"/);
    expect(bundleSource).toMatch(/from\s*"@tanstack\/react-query"/);
    expect(bundleSource).toMatch(/from\s*"@cove\/extension-sdk"/);
    // And the bundle must not inline a second React Query (which would create a second QueryClient).
    expect(bundleSource).not.toMatch(/class QueryClient\b/);
  });

  it("shares the host's single React instance with the externalized extension bundle", async () => {
    const extension = await import(/* @vite-ignore */ artifactPath);
    expect(extension.extensionReact).toBe(React);
  });

  it("resolves useQueryClient() inside the extension bundle to the host client", async () => {
    const extension = await import(/* @vite-ignore */ artifactPath);
    const hostClient = new QueryClient();
    hostClient.setQueryData(["cross-bundle-probe"], "host-seeded");

    let resolved: unknown;
    render(
      React.createElement(
        QueryClientProvider,
        { client: hostClient },
        React.createElement(extension.QueryClientProbe, {
          onResolved: (client: unknown) => {
            resolved = client;
          },
        }),
      ),
    );

    await waitFor(() => expect(resolved).toBe(hostClient));
    // The resolved client is the host client, not a second one: it reads the host-seeded cache.
    expect((resolved as QueryClient).getQueryData(["cross-bundle-probe"])).toBe("host-seeded");
  });
});

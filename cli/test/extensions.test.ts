import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { json, runCli, useTestResources } from "./helpers";

const resources = useTestResources();

interface RecordedInstall {
  endpoint: string;
  contentType: string;
  fileName?: string;
  fileText?: string;
  trustUnverified?: string;
  url?: string;
}

interface ExtensionServerOptions {
  /** Package file names or URLs the server rejects, mapped to the error body it returns. */
  failures?: Record<string, { status: number; body: unknown }>;
  missing?: Record<string, string[]>;
}

/** Derives the installed id and version from names shaped like `<id>-<version>.zip`. */
function packageIdentity(name: string): { extensionId: string; version: string } {
  const match = /([a-z0-9.]+?)-(\d+\.\d+\.\d+(?:-[0-9a-z.]+)?)\.zip$/i.exec(name);
  if (!match) throw new Error(`unexpected test package name ${name}`);
  return { extensionId: match[1]!, version: match[2]! };
}

function extensionServer(options: ExtensionServerOptions = {}): { url: string; installs: RecordedInstall[] } {
  const installs: RecordedInstall[] = [];
  const running = resources.startServer(async request => {
    const path = new URL(request.url).pathname;
    const contentType = request.headers.get("content-type") ?? "";
    if (path === "/api/extensions/install-from-zip" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("file") as File;
      installs.push({
        endpoint: "zip",
        contentType,
        fileName: file.name,
        fileText: await file.text(),
        trustUnverified: form.get("trustUnverified") as string,
      });
      const failure = options.failures?.[file.name];
      if (failure) return json(failure.body, failure.status);
      const identity = packageIdentity(file.name);
      return json({ message: `Extension '${identity.extensionId}' v${identity.version} installed from uploaded ZIP.`, ...identity, path: `/data/extensions/${identity.extensionId}` });
    }
    if (path === "/api/extensions/install-from-url" && request.method === "POST") {
      const body = await request.json() as { url: string; trustUnverified: boolean };
      installs.push({ endpoint: "url", contentType, url: body.url, trustUnverified: String(body.trustUnverified) });
      const failure = options.failures?.[body.url];
      if (failure) return json(failure.body, failure.status);
      return json({ message: "installed from URL.", ...packageIdentity(body.url) });
    }
    const missing = /^\/api\/extensions\/([^/]+)\/dependencies\/missing$/.exec(path);
    if (missing) return json(options.missing?.[decodeURIComponent(missing[1]!)] ?? []);
    return json({}, 404);
  });
  return { url: running.url, installs };
}

async function packageFile(name: string): Promise<string> {
  const path = join(await resources.tempDirectory(), name);
  await writeFile(path, `zip bytes of ${name}`);
  return path;
}

describe("extensions install", () => {
  test("uploads a local ZIP as multipart form data with explicit trust", async () => {
    const server = extensionServer();
    const env = await resources.cliEnvironment({ server: server.url, token: "test-token" });
    const zip = await packageFile("cove.example-0.8.1-dev.20261018143000.zip");

    const result = await runCli(["extensions", "install", zip, "--trust-unverified", "--json"], { env });

    expect(result.exitCode).toBe(0);
    expect(server.installs).toEqual([{
      endpoint: "zip",
      contentType: expect.stringMatching(/^multipart\/form-data; boundary=/),
      fileName: "cove.example-0.8.1-dev.20261018143000.zip",
      fileText: "zip bytes of cove.example-0.8.1-dev.20261018143000.zip",
      trustUnverified: "true",
    }]);
    expect(JSON.parse(result.stdout).installed).toEqual([{
      source: zip,
      extensionId: "cove.example",
      version: "0.8.1-dev.20261018143000",
      path: "/data/extensions/cove.example",
      message: "Extension 'cove.example' v0.8.1-dev.20261018143000 installed from uploaded ZIP.",
      missingDependencies: [],
    }]);
  });

  test("asks Cove to download URLs and installs packages in the given order", async () => {
    const server = extensionServer({ missing: { "ai.faces": ["ai.core"] } });
    const env = await resources.cliEnvironment({ server: server.url, token: "test-token" });
    const zip = await packageFile("ai.faces-0.8.1-dev.1.zip");

    const result = await runCli(["extensions", "install", "https://packages.example/ai.core-0.8.1.zip", zip, "--trust-unverified"], { env });

    expect(result.exitCode).toBe(0);
    expect(server.installs.map(install => install.endpoint)).toEqual(["url", "zip"]);
    expect(server.installs[0]).toMatchObject({ url: "https://packages.example/ai.core-0.8.1.zip", trustUnverified: "true", contentType: "application/json" });
    expect(result.stdout).toContain("Installed 2 extensions");
    expect(result.stdout).toContain("v0.8.1-dev.1 · missing dependencies: ai.core");
  });

  test("requires explicit trust before sending anything", async () => {
    const server = extensionServer();
    const env = await resources.cliEnvironment({ server: server.url, token: "test-token" });
    const zip = await packageFile("cove.example-1.0.0.zip");

    const result = await runCli(["extensions", "install", zip], { env });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("--trust-unverified");
    expect(server.installs).toEqual([]);
  });

  test("rejects a missing ZIP path without contacting the server", async () => {
    const server = extensionServer();
    const env = await resources.cliEnvironment({ server: server.url, token: "test-token" });
    const missing = join(await resources.tempDirectory(), "absent.zip");

    const result = await runCli(["extensions", "install", missing, "--trust-unverified"], { env });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(`${missing}: no extension ZIP file exists at this path.`);
    expect(server.installs).toEqual([]);
  });

  test("stops at the first failure, reports Cove's reason, and names what was already installed", async () => {
    const server = extensionServer({
      failures: {
        "ai.faces-0.8.1-dev.1.zip": {
          status: 500,
          body: { message: "Extension 'ai.faces' was uploaded but failed to initialize.", restartRequiredReason: "ai.faces holds native libraries; restart Cove." },
        },
      },
    });
    const env = await resources.cliEnvironment({ server: server.url, token: "test-token" });
    const core = await packageFile("ai.core-0.8.1-dev.1.zip");
    const faces = await packageFile("ai.faces-0.8.1-dev.1.zip");
    const tagging = await packageFile("ai.tagging-0.8.1-dev.1.zip");

    const result = await runCli(["extensions", "install", core, faces, tagging, "--trust-unverified"], { env });

    expect(result.exitCode).not.toBe(0);
    expect(server.installs.map(install => install.fileName)).toEqual(["ai.core-0.8.1-dev.1.zip", "ai.faces-0.8.1-dev.1.zip"]);
    expect(result.stderr).toContain(`${faces}: Extension 'ai.faces' was uploaded but failed to initialize. (ai.faces holds native libraries; restart Cove.)`);
    expect(result.stderr).toContain("Already installed: ai.core v0.8.1-dev.1.");
  });
});

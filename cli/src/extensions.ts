import { basename, resolve } from "node:path";
import { stat } from "node:fs/promises";
import type { CoveClient } from "./client";
import { CliError } from "./errors";

/** Installation unloads, replaces, and initializes the extension, which outlasts ordinary requests. */
const INSTALL_TIMEOUT_MS = 300_000;

export interface InstalledExtension {
  source: string;
  extensionId: string;
  version: string;
  path?: string;
  message: string;
  missingDependencies: string[];
}

interface InstallResponse {
  message?: unknown;
  extensionId?: unknown;
  version?: unknown;
  path?: unknown;
}

export function isPackageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function objectField(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Adds the reasons Cove reports beside a failed install, such as locked files or a required restart. */
function installFailure(source: string, error: CliError): CliError {
  const notes = [objectField(error.details, "detail"), objectField(error.details, "restartRequiredReason")]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "");
  const suffix = notes.length ? ` (${notes.join("; ")})` : "";
  return new CliError(error.code, `${source}: ${error.message}${suffix}`, { status: error.status, details: error.details });
}

async function packageForm(source: string): Promise<FormData> {
  const path = resolve(source);
  let isFile = false;
  try {
    isFile = (await stat(path)).isFile();
  } catch {
    // Reported below as a missing package.
  }
  if (!isFile) throw new CliError("INVALID_ARGUMENT", `${source}: no extension ZIP file exists at this path.`);
  const form = new FormData();
  form.append("file", Bun.file(path), basename(path));
  form.append("trustUnverified", "true");
  return form;
}

async function missingDependencies(client: CoveClient, extensionId: string): Promise<string[]> {
  try {
    const missing = await client.get<unknown>(`extensions/${encodeURIComponent(extensionId)}/dependencies/missing`);
    return Array.isArray(missing) ? missing.filter((value): value is string => typeof value === "string") : [];
  } catch (error) {
    if (error instanceof CliError && error.status === 404) return [];
    throw error;
  }
}

/**
 * Installs one extension package from a local ZIP path or an http(s) URL. Cove
 * downloads URLs itself, so a URL must be reachable from the server.
 */
export async function installExtensionPackage(client: CoveClient, source: string): Promise<InstalledExtension> {
  const init: RequestInit = isPackageUrl(source)
    ? { method: "POST", body: JSON.stringify({ url: source, trustUnverified: true }) }
    : { method: "POST", body: await packageForm(source) };
  const endpoint = isPackageUrl(source) ? "extensions/install-from-url" : "extensions/install-from-zip";

  let response: InstallResponse;
  try {
    response = await client.request<InstallResponse>(endpoint, init, true, INSTALL_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof CliError) throw installFailure(source, error);
    throw error;
  }
  if (typeof response?.extensionId !== "string" || typeof response.version !== "string") {
    throw new CliError("INVALID_RESPONSE", `${source}: Cove returned an invalid installation response.`);
  }

  return {
    source,
    extensionId: response.extensionId,
    version: response.version,
    ...(typeof response.path === "string" ? { path: response.path } : {}),
    message: typeof response.message === "string" ? response.message : `Extension '${response.extensionId}' v${response.version} installed.`,
    missingDependencies: await missingDependencies(client, response.extensionId),
  };
}

/** Installs packages in the given order and stops at the first failure, naming what was already installed. */
export async function installExtensionPackages(client: CoveClient, sources: string[]): Promise<InstalledExtension[]> {
  const installed: InstalledExtension[] = [];
  for (const source of sources) {
    try {
      installed.push(await installExtensionPackage(client, source));
    } catch (error) {
      if (!(error instanceof CliError) || !installed.length) throw error;
      const done = installed.map(item => `${item.extensionId} v${item.version}`).join(", ");
      throw new CliError(error.code, `${error.message} Already installed: ${done}.`, {
        status: error.status,
        details: { installed, failure: error.details ?? null },
      });
    }
  }
  return installed;
}

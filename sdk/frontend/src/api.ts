/**
 * Typed API client for Cove extensions.
 *
 * Extensions call the Cove API through this client rather than raw fetch(): it is typed over the
 * generated `@cove/types` `paths` tree (wrong paths or params are compile errors) and reproduces the
 * host's authentication behaviour — bearer / share-token header injection and a single
 * refresh-and-retry on a 401 — so extension requests inherit the host session without weakening it.
 */

import createClient, { type Client, type Middleware } from "openapi-fetch";
import type { paths } from "@cove/types";

/**
 * Accessor over the live host session. The host wires this so the SDK reads the single host token
 * source rather than bundling or copying it; until configured the client sends no credentials and
 * relies on the same-origin cookie. The accessor is intentionally narrow — it never exposes the
 * host auth store itself.
 */
export interface CoveClientAuthAccessor {
  getAccessToken?: () => string | null | undefined;
  getShareToken?: () => string | null | undefined;
  getSharePassword?: () => string | null | undefined;
  getRefreshToken?: () => string | null | undefined;
  tryRefresh?: () => Promise<boolean>;
}

let authAccessor: CoveClientAuthAccessor = {};

/**
 * Configure the accessor the auth middleware reads. Called by the host once at startup with a
 * setter bound to the live host session; extension authors do not call this directly.
 */
export function configureCoveClientAuth(accessor: CoveClientAuthAccessor): void {
  authAccessor = accessor ?? {};
}

function dispatchAuthRequired(): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("cove-auth-required"));
  }
}

type AuthMode = "share" | "bearer" | "none";

/** Apply the host credentials to an outgoing request's headers and report the resolved auth mode. */
function applyAuthHeaders(headers: Headers): AuthMode {
  const token = authAccessor.getAccessToken?.();
  const shareToken = authAccessor.getShareToken?.();
  const sharePassword = authAccessor.getSharePassword?.();
  if (shareToken) {
    headers.set("X-Share-Token", shareToken);
    if (sharePassword) {
      headers.set("X-Share-Password", sharePassword);
    }
    return "share";
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return token ? "bearer" : "none";
}

// Keep a pristine clone of each outgoing request so a refreshed retry can re-send the original body
// and headers (a Request body is a one-shot stream consumed by the first fetch).
const pristineRequests = new WeakMap<Request, Request>();

const authMiddleware: Middleware = {
  onRequest({ request }) {
    applyAuthHeaders(request.headers);
    pristineRequests.set(request, request.clone());
    return request;
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) {
      return response;
    }
    const token = authAccessor.getAccessToken?.();
    const authMode: AuthMode = authAccessor.getShareToken?.() ? "share" : token ? "bearer" : "none";
    if (authMode === "bearer" && token && authAccessor.getRefreshToken?.()) {
      const refreshed = (await authAccessor.tryRefresh?.()) ?? false;
      if (refreshed) {
        const retryToken = authAccessor.getAccessToken?.();
        const pristine = pristineRequests.get(request);
        const retry = pristine ? pristine.clone() : request.clone();
        if (retryToken) {
          retry.headers.set("Authorization", `Bearer ${retryToken}`);
        }
        return fetch(retry);
      }
      dispatchAuthRequired();
    } else if (authMode === "none") {
      dispatchAuthRequired();
    }
    return response;
  },
};

export type CoveClient = Client<paths>;

/**
 * Create a Cove API client typed over the generated `paths`. Path keys already carry the `/api`
 * prefix, so `baseUrl` defaults to the empty string (same-origin relative requests). Pass a
 * `baseUrl` only to target a different origin.
 */
export function createCoveClient(options?: { baseUrl?: string }): CoveClient {
  const client = createClient<paths>({ baseUrl: options?.baseUrl ?? "" });
  client.use(authMiddleware);
  return client;
}

let sharedClient: CoveClient | null = null;

function getClient(): CoveClient {
  return (sharedClient ??= createCoveClient());
}

/**
 * Return the shared same-origin client — created once and reused, so every call inherits the
 * configured host session. The hooks use this to fetch through the typed client; pass an explicit
 * client to {@link createCoveClient} instead when you need to target another origin.
 */
export function getCoveClient(): CoveClient {
  return getClient();
}

/** Error thrown by the extension helpers when the API returns a non-success response. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly path: string,
  ) {
    super(`API ${status} ${path}: ${body}`);
    this.name = "ApiError";
  }
}

function toApiError(error: unknown, response: Response, path: string): ApiError {
  const body = typeof error === "string" ? error : error != null ? JSON.stringify(error) : response.statusText;
  return new ApiError(response.status, body, path);
}

/**
 * Extension data store — scoped key/value storage for your extension, backed by the host's
 * `/api/Extensions/{id}/data` endpoints.
 */
export function createExtensionStore(extensionId: string) {
  const client = getClient();
  return {
    /** Read the extension's full key/value map. */
    getAll: async (): Promise<Record<string, string>> => {
      const { data, error, response } = await client.GET("/api/Extensions/{id}/data", {
        params: { path: { id: extensionId } },
      });
      if (error) {
        throw toApiError(error, response, `/api/Extensions/${extensionId}/data`);
      }
      return (data as Record<string, string> | undefined) ?? {};
    },
    /** Read a single stored value, or null if it is not set. */
    get: async (key: string): Promise<string | null> => {
      const { data, error, response } = await client.GET("/api/Extensions/{id}/data", {
        params: { path: { id: extensionId } },
      });
      if (error) {
        throw toApiError(error, response, `/api/Extensions/${extensionId}/data`);
      }
      const map = (data as Record<string, string> | undefined) ?? {};
      return key in map ? map[key] : null;
    },
    /** Store a value under a key. */
    set: async (key: string, value: string): Promise<void> => {
      const { error, response } = await client.PUT("/api/Extensions/{id}/data/{key}", {
        params: { path: { id: extensionId, key } },
        body: value,
      });
      if (error) {
        throw toApiError(error, response, `/api/Extensions/${extensionId}/data/${key}`);
      }
    },
  };
}

/**
 * Run a job defined by your extension.
 */
export async function runExtensionJob(
  extensionId: string,
  jobId: string,
  parameters?: Record<string, string>,
): Promise<void> {
  const client = getClient();
  const { error, response } = await client.POST("/api/Extensions/{id}/jobs/{jobId}/run", {
    params: { path: { id: extensionId, jobId } },
    body: parameters ?? null,
  });
  if (error) {
    throw toApiError(error, response, `/api/Extensions/${extensionId}/jobs/${jobId}/run`);
  }
}

const API_BASE = "/api";

/**
 * Free-form authenticated fetch for the generic data hooks, where the caller supplies the path.
 * It shares the same host credentials and single refresh-and-retry as the typed client. Endpoint
 * calls made by the SDK itself go through the typed client above; this helper carries only
 * caller-owned paths and is not part of the public SDK surface.
 */
async function authedFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  const authMode = applyAuthHeaders(headers);
  let res = await fetch(input, { ...init, headers });
  if (res.status === 401 && authMode === "bearer" && authAccessor.getRefreshToken?.()) {
    const refreshed = (await authAccessor.tryRefresh?.()) ?? false;
    if (refreshed) {
      const retryHeaders = new Headers(init?.headers ?? {});
      const retryToken = authAccessor.getAccessToken?.();
      if (retryToken) {
        retryHeaders.set("Authorization", `Bearer ${retryToken}`);
      }
      res = await fetch(input, { ...init, headers: retryHeaders });
    } else {
      dispatchAuthRequired();
    }
  } else if (res.status === 401 && authMode === "none") {
    dispatchAuthRequired();
  }
  return res;
}

/**
 * Make an authenticated JSON request to a caller-supplied API path (relative to the API root).
 * Used by the data hooks; the typed `createCoveClient` is the preferred surface for known endpoints.
 */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await authedFetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText, path);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

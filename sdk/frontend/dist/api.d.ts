/**
 * Typed API client for Cove extensions.
 *
 * Extensions call the Cove API through this client rather than raw fetch(): it is typed over the
 * generated `@cove/types` `paths` tree (wrong paths or params are compile errors) and reproduces the
 * host's authentication behaviour — bearer / share-token header injection and a single
 * refresh-and-retry on a 401 — so extension requests inherit the host session without weakening it.
 */
import { type Client } from "openapi-fetch";
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
/**
 * Configure the accessor the auth middleware reads. Called by the host once at startup with a
 * setter bound to the live host session; extension authors do not call this directly.
 */
export declare function configureCoveClientAuth(accessor: CoveClientAuthAccessor): void;
export type CoveClient = Client<paths>;
/**
 * Create a Cove API client typed over the generated `paths`. Path keys already carry the `/api`
 * prefix, so `baseUrl` defaults to the empty string (same-origin relative requests). Pass a
 * `baseUrl` only to target a different origin.
 */
export declare function createCoveClient(options?: {
    baseUrl?: string;
}): CoveClient;
/**
 * Return the shared same-origin client — created once and reused, so every call inherits the
 * configured host session. The hooks use this to fetch through the typed client; pass an explicit
 * client to {@link createCoveClient} instead when you need to target another origin.
 */
export declare function getCoveClient(): CoveClient;
/** Error thrown by the extension helpers when the API returns a non-success response. */
export declare class ApiError extends Error {
    readonly status: number;
    readonly body: string;
    readonly path: string;
    constructor(status: number, body: string, path: string);
}
/**
 * Extension data store — scoped key/value storage for your extension, backed by the host's
 * `/api/Extensions/{id}/data` endpoints.
 */
export declare function createExtensionStore(extensionId: string): {
    /** Read the extension's full key/value map. */
    getAll: () => Promise<Record<string, string>>;
    /** Read a single stored value, or null if it is not set. */
    get: (key: string) => Promise<string | null>;
    /** Store a value under a key. */
    set: (key: string, value: string) => Promise<void>;
};
/**
 * Run a job defined by your extension.
 */
export declare function runExtensionJob(extensionId: string, jobId: string, parameters?: Record<string, string>): Promise<void>;
/**
 * Make an authenticated JSON request to a caller-supplied API path (relative to the API root).
 * Used by the data hooks; the typed `createCoveClient` is the preferred surface for known endpoints.
 */
export declare function request<T>(path: string, options?: RequestInit): Promise<T>;
//# sourceMappingURL=api.d.ts.map
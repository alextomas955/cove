/**
 * @cove/extension-sdk
 *
 * SDK for building Cove UI extensions.
 *
 * @example
 * ```tsx
 * import { defineExtension, createCoveClient, useEntityList } from "@cove/extension-sdk";
 * ```
 */
// Generated host-key constants (referenced instead of magic strings). Values plus their unions.
// The runtime values come from ./contracts, which the build inlines so the published bundle carries
// them directly instead of importing the types-only @cove/types package at runtime.
export { EntityKinds, EventKinds, ExtensionActionKinds, UiComponentKeys, UiPageKeys, UiSlotKeys, UiZoneKeys, } from "./contracts";
// Extension definition helper
export { defineExtension } from "./define";
// Typed API client plus the extension helpers. The host-session accessor is bound by the host
// through the separate host-internal entry (./host), not this author-facing barrel.
export { createCoveClient, ApiError, createExtensionStore, runExtensionJob, } from "./api";
// Hooks
export { useFetch, useExtensionStore, useEntityList, useJobPolling, isTerminalJobStatus, DEFAULT_JOB_POLL_INTERVAL_MS, } from "./hooks";

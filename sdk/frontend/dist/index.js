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
export { EntityKinds, EventKinds, ExtensionActionKinds, UiComponentKeys, UiPageKeys, UiSlotKeys, UiZoneKeys, } from "@cove/types";
// Extension definition helper
export { defineExtension } from "./define";
// Typed API client + host-session accessor, plus the extension helpers.
export { createCoveClient, configureCoveClientAuth, ApiError, createExtensionStore, runExtensionJob, } from "./api";
// Hooks
export { useFetch, useExtensionStore, useEntityList } from "./hooks";

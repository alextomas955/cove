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

// Types (sourced from the generated contract via ./types + ./surface).
export type {
  EntityType,
  CriterionModifier,
  ListCriterionType,
  CustomFieldType,
  EntityTabProps,
  SlotProps,
  PageProps,
  DetailPageProps,
  NavigateTarget,
  FindFilter,
  JobInfo,
  JobStatus,
  ListFilterOption,
  ListFilterContribution,
  ListSortContribution,
  UIManifestListContributions,
  ExtensionActionHandler,
  ExtensionModule,
} from "./types";

// Generated host-key constants (referenced instead of magic strings). Values plus their unions.
export {
  EntityKinds,
  EventKinds,
  ExtensionActionKinds,
  UiComponentKeys,
  UiPageKeys,
  UiSlotKeys,
  UiZoneKeys,
} from "@cove/types";
export type {
  EntityKind,
  EventKind,
  ExtensionActionKind,
  UiComponentKey,
  UiPageKey,
  UiSlotKey,
  UiZoneKey,
} from "@cove/types";

// Extension definition helper
export { defineExtension } from "./define";

// Typed API client plus the extension helpers. The host-session accessor is bound by the host
// through the separate host-internal entry (./host), not this author-facing barrel.
export {
  createCoveClient,
  ApiError,
  createExtensionStore,
  runExtensionJob,
} from "./api";
export type { CoveClient } from "./api";

// Hooks
export {
  useFetch,
  useExtensionStore,
  useEntityList,
  useJobPolling,
  isTerminalJobStatus,
  DEFAULT_JOB_POLL_INTERVAL_MS,
} from "./hooks";
export type { UseJobPollingOptions } from "./hooks";

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
export type { EntityType, CriterionModifier, ListCriterionType, CustomFieldType, EntityTabProps, SlotProps, PageProps, DetailPageProps, NavigateTarget, FindFilter, JobInfo, JobStatus, ListFilterOption, ListFilterContribution, ListSortContribution, UIManifestListContributions, ExtensionActionHandler, ExtensionModule, } from "./types";
export { EntityKinds, EventKinds, ExtensionActionKinds, UiComponentKeys, UiPageKeys, UiSlotKeys, UiZoneKeys, } from "./contracts";
export type { EntityKind, EventKind, ExtensionActionKind, UiComponentKey, UiPageKey, UiSlotKey, UiZoneKey, } from "@cove/types";
export { defineExtension } from "./define";
export { createCoveClient, ApiError, createExtensionStore, runExtensionJob, } from "./api";
export type { CoveClient } from "./api";
export { useFetch, useExtensionStore, useEntityList, useJobPolling, isTerminalJobStatus, DEFAULT_JOB_POLL_INTERVAL_MS, } from "./hooks";
export type { UseJobPollingOptions } from "./hooks";
//# sourceMappingURL=index.d.ts.map
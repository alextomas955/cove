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
export type { EntityType, CriterionModifier, ListCriterionType, CustomFieldType, EntityTabProps, SlotProps, PageProps, DetailPageProps, NavigateTarget, FindFilter, ListFilterOption, ListFilterContribution, ListSortContribution, UIManifestListContributions, ExtensionActionHandler, ExtensionModule, } from "./types";
export { EntityKinds, EventKinds, ExtensionActionKinds, UiComponentKeys, UiPageKeys, UiSlotKeys, UiZoneKeys, } from "@cove/types";
export type { EntityKind, EventKind, ExtensionActionKind, UiComponentKey, UiPageKey, UiSlotKey, UiZoneKey, } from "@cove/types";
export { defineExtension } from "./define";
export { createCoveClient, configureCoveClientAuth, ApiError, createExtensionStore, runExtensionJob, } from "./api";
export type { CoveClient, CoveClientAuthAccessor } from "./api";
export { useFetch, useExtensionStore, useEntityList } from "./hooks";
//# sourceMappingURL=index.d.ts.map
/**
 * @cove/extension-sdk — type surface for the Cove extension system.
 *
 * This module is a re-export barrel: every DTO/enum/contribution shape comes from the generated
 * `@cove/types` package (derived from the committed API contract and the host-key registry), and
 * the author-facing prop contracts come from `./surface`. There are no hand-written DTO or enum
 * mirrors here — the single source of truth for each wire shape is `@cove/types`.
 */

// Host-key set and wire enums/DTOs (from @cove/types: the OpenAPI surface + the generated
// contract constants). `EntityType` is the host entity-kind set (contracts.g `EntityKind`).
export type {
  EntityKind as EntityType,
  CriterionModifier,
  CustomFieldType,
  FindFilter,
  UiListFilterOption as ListFilterOption,
  UiListFilterContribution as ListFilterContribution,
  UiListSortContribution as ListSortContribution,
} from "@cove/types";

// Author-facing prop contracts and SDK-only convenience shapes (no wire counterpart).
export type {
  ListCriterionType,
  EntityTabProps,
  SlotProps,
  PageProps,
  DetailPageProps,
  NavigateTarget,
  ExtensionActionHandler,
  UIManifestListContributions,
  ExtensionModule,
} from "./surface";

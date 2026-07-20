/**
 * Author-facing surface shapes for the Cove extension SDK.
 *
 * These are the prop contracts and convenience shapes an extension author writes against that have
 * no wire counterpart in the API contract — component props, navigation targets, the extension
 * module shape, and the action-handler signature. Anything with a wire/DTO counterpart is
 * re-exported from `@cove/types` by `./types` instead; nothing here mirrors a generated schema.
 */
import type { FC } from "react";
import type { ExtensionAction, UiListFilterContribution, UiListSortContribution, UiPageKey } from "@cove/types";
/**
 * Criterion value domains an extension list filter can declare. The API contract carries the
 * criterion type as an open string; this is the SDK-side set of well-known kinds.
 */
export type ListCriterionType = "string" | "number" | "date" | "timestamp" | "duration" | "rating" | "multiId" | "enum" | "bool";
/** Props passed to extension components rendered in entity detail tabs. */
export interface EntityTabProps {
    entityId: number;
}
/** Props passed to extension components rendered in slots. */
export interface SlotProps<TContext = Record<string, unknown>> {
    context: TContext;
}
/**
 * Navigation target for the `onNavigate` callback. `page` accepts the host page keys
 * (`UiPageKey`) and stays open for extension-owned routes.
 */
export interface NavigateTarget {
    page: UiPageKey | (string & {});
    id?: number;
    [key: string]: unknown;
}
/** Props passed to extension page components. */
export interface PageProps {
    onNavigate: (route: NavigateTarget) => void;
    params?: Record<string, string>;
}
/** Props passed to extension detail page components. */
export interface DetailPageProps {
    id: number;
    onNavigate: (route: NavigateTarget) => void;
}
/**
 * Handler for an extension action, matching the host's action registry contract. `action` is the
 * generated `ExtensionAction` wire shape; the return value may be sync or async.
 */
export type ExtensionActionHandler = (action: ExtensionAction, payload: Record<string, unknown>) => Promise<unknown> | unknown;
/**
 * List contributions grouped for an extension manifest. The element shapes are the generated
 * contribution types, so field definitions stay in sync with the contract.
 */
export interface UIManifestListContributions {
    listFilters?: UiListFilterContribution[];
    listSorts?: UiListSortContribution[];
}
/** The default export expected from an extension's JS bundle. */
export interface ExtensionModule {
    /** Map of component name (author-owned) to React component. */
    components: Record<string, FC<any>>;
    /** Map of action name (author-owned) to its handler; read by the host action registry. */
    actionHandlers?: Record<string, ExtensionActionHandler>;
    /** Optional lifecycle hook called after the extension is loaded. */
    onLoad?: () => void | Promise<void>;
    /** Optional cleanup hook called before unload. */
    onUnload?: () => void;
}
//# sourceMappingURL=surface.d.ts.map
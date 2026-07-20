/**
 * Local re-export of the generated host-key constant values.
 *
 * The SDK's public barrel re-exports these constants as runtime values. `@cove/types` is a
 * types-only workspace package with no runtime entry point, so importing the values from it at
 * runtime would be unresolvable for anyone consuming the published SDK on its own. Routing the value
 * re-export through this module lets the build inline the constants into the SDK's own runtime output
 * (see `scripts/bundle-runtime.mjs`), keeping the published bundle self-contained. The single source
 * of truth is still the generated contract — this file only re-exports it; the values are never
 * hand-copied.
 */
export { EntityKinds, EventKinds, ExtensionActionKinds, UiComponentKeys, UiPageKeys, UiSlotKeys, UiZoneKeys, } from "@cove/types";
//# sourceMappingURL=contracts.d.ts.map
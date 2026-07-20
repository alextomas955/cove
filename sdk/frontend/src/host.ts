/**
 * Host-internal entry for the Cove extension SDK.
 *
 * This surface is for the host application only and is deliberately kept out of the main
 * `@cove/extension-sdk` barrel — and therefore out of the single shared runtime module that loaded
 * extensions resolve. The host binds the live session accessor through here once at startup; because
 * extensions never receive this entry, one extension cannot rebind or observe the host's (or another
 * extension's) auth by importing the SDK.
 */
export { configureCoveClientAuth } from "./api";
export type { CoveClientAuthAccessor } from "./api";

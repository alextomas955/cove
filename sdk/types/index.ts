// Public entry for the @cove/types package.
// Re-exports the types derived from the committed OpenAPI document. This barrel is
// hand-maintained and stable; the generated surface lives in ./openapi.ts.
export * from "./openapi";

// Generated host-key constants (entity kinds, event kinds, UI slot/zone/page/component keys,
// action kinds) derived from the committed contract document. See ./contracts.g.ts.
export * from "./contracts.g";

// Client-only convenience types (unions, inline projections, structural generics) that have
// no wire counterpart in the OpenAPI document. See ./client-only.ts for the rationale.
export * from "./client-only";

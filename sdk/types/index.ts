// Public entry for the @cove/types package.
// Re-exports the types derived from the committed OpenAPI document. This barrel is
// hand-maintained and stable; the generated surface lives in ./openapi.ts.
export * from "./openapi";

// Client-only convenience types (unions, inline projections, structural generics) that have
// no wire counterpart in the OpenAPI document. See ./client-only.ts for the rationale.
export * from "./client-only";

// Runtime-sharing probe fixture.
//
// Models an extension frontend bundle that consumes the shared runtime the way the
// import-map wires it in production: bare imports of `react` and `@tanstack/react-query`
// are redirected to the host's single module instances (see
// ui/scripts/extension-runtime-contract.ts `legacySpecifiers` and the generated re-export
// shims in ui/scripts/generate-extension-runtime.ts). Because those shims re-export the
// host's own module objects, an extension resolves the SAME React and the SAME react-query
// instance the host renders with — so hooks read the host's providers.
//
// This fixture exposes probes for two resolution modes so a test can assert the invariant
// empirically:
//   - shared mode  (production): imports resolve to host singletons -> host QueryClient.
//   - bundled-copy mode (the failure this must prevent): the extension ships its OWN copy
//     of react-query, whose module-scoped context object the host provider never populates.

import * as React from "react";
import * as reactQueryRuntime from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// The React module namespace this fixture links against. A test compares it by reference
// to the host's React namespace to prove there is exactly one React instance.
export const fixtureReact = React;

export type RuntimeProbe = {
  reactInstance: typeof React;
  queryClient: ReturnType<typeof useQueryClient>;
};

// Shared mode: consumes react-query exactly as an externalized extension bundle would.
// Rendered under the host <QueryClientProvider>, this must return the host's client.
export function useRuntimeProbe(): RuntimeProbe {
  return { reactInstance: React, queryClient: useQueryClient() };
}

// Reads the host query cache through the shared client. If host and extension shared a
// single QueryClient, a value seeded by the host is visible here (no split cache).
export function useSharedCacheProbe(queryKey: readonly unknown[]) {
  return useQuery({
    queryKey: [...queryKey],
    queryFn: async () => "resolved-by-extension",
    staleTime: Infinity,
  });
}

// The additive v2 path: `@cove/extension-sdk` joins the import-map as one more host-provided
// shared module. Its generated shim re-exports the host react-query singleton, exactly like
// generate-extension-runtime.ts emits today:
//   import * as runtimeModule from "@tanstack/react-query";
//   export const useQueryClient = runtimeModule.useQueryClient;
// A hook the SDK ships (e.g. a future useJobPolling) is therefore built on the host copy.
export const sdkRuntimeShim = {
  useQueryClient: reactQueryRuntime.useQueryClient,
};

export function useSdkQueryClient(): ReturnType<typeof useQueryClient> {
  return sdkRuntimeShim.useQueryClient();
}

// Bundled-copy mode (negative control): a second, extension-bundled copy of react-query owns
// its OWN module-scoped context object. The host's <QueryClientProvider> is bound to the host
// copy's context, so it never flows into this one -> the extension observes no client.
const BundledCopyQueryClientContext = React.createContext<unknown>(undefined);

export function useBundledCopyQueryClient(): unknown {
  return React.useContext(BundledCopyQueryClientContext);
}

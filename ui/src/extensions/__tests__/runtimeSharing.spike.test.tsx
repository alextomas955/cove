import type { PropsWithChildren } from "react";
import * as HostReact from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  fixtureReact,
  useBundledCopyQueryClient,
  useRuntimeProbe,
  useSdkQueryClient,
  useSharedCacheProbe,
} from "../../../scripts/__fixtures__/v2-spike-extension";

// Empirical proof of the extension runtime-sharing invariant: an extension bundle that
// externalizes `react` + `@tanstack/react-query` (as the import-map does today) resolves
// the SAME React instance and reads the HOST QueryClient — and the additive path of adding
// one more externalized shared module (@cove/extension-sdk) preserves that invariant.
//
// jsdom cannot execute a real externalized cross-bundle import-map load in-process, so the
// two resolution modes are simulated: "shared" (the production import-map redirect, where an
// extension links against the host's single module instances) versus "bundled-copy" (the
// failure mode, where an extension ships its own second copy of a runtime module).

function makeHostQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("extension runtime sharing", () => {
  it("shares the host's single React instance with the extension bundle", () => {
    // Referential identity of the React module namespace: one React, one dispatcher.
    // A second React copy is what triggers "Invalid hook call" in a loaded extension.
    expect(fixtureReact).toBe(HostReact);
  });

  it("resolves useQueryClient() inside the extension to the host client (not undefined)", () => {
    const hostClient = makeHostQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={hostClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRuntimeProbe(), { wrapper });

    expect(result.current.reactInstance).toBe(HostReact);
    expect(result.current.queryClient).toBe(hostClient);
  });

  it("reads the host query cache through the shared client (no split cache)", async () => {
    const hostClient = makeHostQueryClient();
    const sharedKey = ["cove", "runtime-sharing", "seeded"] as const;
    hostClient.setQueryData([...sharedKey], "seeded-by-host");

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={hostClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSharedCacheProbe(sharedKey), { wrapper });

    // The extension observes the host-seeded value: both sides read one cache.
    await waitFor(() => expect(result.current.data).toBe("seeded-by-host"));
  });

  it("preserves the invariant when @cove/extension-sdk is the externalized shared module (additive v2)", () => {
    // The SDK shim re-exports the host react-query singleton, so a hook consumed THROUGH the
    // SDK still reads the host client — proving v2 = v1 + one more shared module is safe.
    const hostClient = makeHostQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={hostClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSdkQueryClient(), { wrapper });

    expect(result.current).toBe(hostClient);
  });

  it("negative control: a bundled-copy runtime does NOT see the host client", () => {
    // Models an extension that failed to externalize react-query and bundled its own copy.
    // That copy's module-scoped context is never populated by the host provider.
    const hostClient = makeHostQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={hostClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useBundledCopyQueryClient(), { wrapper });

    // The host client does not leak into the bundled copy's context — exactly what
    // externalizing @cove/extension-sdk (+ react/react-query) prevents.
    expect(result.current).toBeUndefined();
    expect(result.current).not.toBe(hostClient);
  });

  it("negative control: a second QueryClient shadows the host client for its subtree", () => {
    // If an extension instantiates and provides its OWN QueryClient, hooks under it read the
    // extension's client, not the host's — the split-cache hazard the import-map avoids.
    const hostClient = makeHostQueryClient();
    const extensionClient = makeHostQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={hostClient}>
        <QueryClientProvider client={extensionClient}>{children}</QueryClientProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useRuntimeProbe(), { wrapper });

    expect(result.current.queryClient).toBe(extensionClient);
    expect(result.current.queryClient).not.toBe(hostClient);
  });
});

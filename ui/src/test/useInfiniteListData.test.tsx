import { hashKey, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useInfiniteListData } from "../hooks/useInfiniteListData";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useInfiniteListData", () => {
  it("uses a positive chunk size when the saved default page size is Infinite", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const queryPage = vi.fn().mockImplementation(async (filter) => ({
      items: [{ id: 1 }],
      totalCount: 1,
      page: filter.page,
      perPage: filter.perPage,
    }));

    const { result } = renderHook(
      () =>
        useInfiniteListData({
          queryKey: ["studios"],
          filter: { page: 1, perPage: 0 },
          chunkSize: 0,
          queryPage,
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.items).toEqual([{ id: 1 }]));
    expect(queryPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1, perPage: 40 }));
  });

  it("moves the settled list key to a new page only once that page's data arrives", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let releaseSecondPage: () => void = () => {};
    const queryPage = vi.fn().mockImplementation((filter) => {
      const response = { items: [{ id: filter.page }], totalCount: 2, page: filter.page, perPage: filter.perPage };
      if (filter.page === 1) return Promise.resolve(response);
      return new Promise((resolve) => {
        releaseSecondPage = () => resolve(response);
      });
    });

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useInfiniteListData({ queryKey: ["videos"], filter: { page, perPage: 1 }, queryPage }),
      { wrapper: createWrapper(queryClient), initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.items).toEqual([{ id: 1 }]));
    const firstPageKey = result.current.settledListKey;

    // While page 2 loads, page 1 stays on screen as a placeholder and still owns the key.
    rerender({ page: 2 });
    await waitFor(() => expect(queryPage).toHaveBeenCalledTimes(2));
    expect(result.current.items).toEqual([{ id: 1 }]);
    expect(result.current.settledListKey).toBe(firstPageKey);

    releaseSecondPage();
    await waitFor(() => expect(result.current.items).toEqual([{ id: 2 }]));
    expect(result.current.settledListKey).toBe(hashKey(["videos", { page: 2, perPage: 1 }]));
  });

  it("moves the settled list key to a new infinite list only once its first chunk arrives", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let releaseSecondList: () => void = () => {};
    const queryPage = vi.fn().mockImplementation((filter) => {
      const response = { items: [{ id: filter.q === "first" ? 1 : 2 }], totalCount: 1, page: 1, perPage: 1 };
      if (filter.q === "first") return Promise.resolve(response);
      return new Promise((resolve) => {
        releaseSecondList = () => resolve(response);
      });
    });

    const { result, rerender } = renderHook(
      ({ q }: { q: string }) =>
        useInfiniteListData({ queryKey: ["videos"], filter: { q, page: 1, perPage: 0 }, queryPage }),
      { wrapper: createWrapper(queryClient), initialProps: { q: "first" } },
    );
    await waitFor(() => expect(result.current.items).toEqual([{ id: 1 }]));
    const firstListKey = result.current.settledListKey;

    rerender({ q: "second" });
    await waitFor(() => expect(queryPage).toHaveBeenCalledTimes(2));
    expect(result.current.items).toEqual([{ id: 1 }]);
    expect(result.current.settledListKey).toBe(firstListKey);

    releaseSecondList();
    await waitFor(() => expect(result.current.items).toEqual([{ id: 2 }]));
    expect(result.current.settledListKey).toBe(hashKey(["videos", { q: "second", page: 1, perPage: 0 }]));
  });
});

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Image } from "../api/types";
import { usePaginatedImageLightbox } from "../hooks/usePaginatedImageLightbox";

const image = (id: number, title: string): Image => ({ id, title, files: [] }) as unknown as Image;

describe("usePaginatedImageLightbox", () => {
  it("opens the selected image and loads an adjacent page with the active filter", async () => {
    const queryPage = vi.fn().mockResolvedValue({ items: [image(3, "Third")], totalCount: 3 });
    const { result } = renderHook(() =>
      usePaginatedImageLightbox({
        items: [image(1, "First"), image(2, "Second")],
        filter: { page: 1, perPage: 2, sort: "title", direction: "asc", q: "needle" },
        totalCount: 3,
        infinitePageSize: false,
        queryPage,
        toLightboxImage: (item) => ({ id: item.id, src: `/image/${item.id}`, title: item.title }),
      }),
    );

    act(() => result.current.openImage(2));
    expect(result.current.lightboxProps.open).toBe(true);
    expect(result.current.lightboxProps.initialIndex).toBe(1);
    expect(result.current.lightboxProps.totalCount).toBe(3);
    expect(result.current.lightboxProps.positionOffset).toBe(0);
    expect(result.current.lightboxProps.hasNext).toBe(true);

    let loaded: Awaited<ReturnType<NonNullable<typeof result.current.lightboxProps.loadNext>>> = [];
    await act(async () => {
      loaded = await result.current.lightboxProps.loadNext!();
    });
    expect(queryPage).toHaveBeenCalledWith({ page: 2, perPage: 2, sort: "title", direction: "asc", q: "needle" });
    expect(loaded).toEqual([{ id: 3, src: "/image/3", title: "Third" }]);
  });

  it("uses a selected-image scope without exposing remote boundaries", () => {
    const selected = [image(2, "Second"), image(4, "Fourth")];
    const { result } = renderHook(() =>
      usePaginatedImageLightbox({
        items: [image(1, "First"), ...selected],
        filter: { page: 2, perPage: 2 },
        totalCount: 8,
        infinitePageSize: false,
        queryPage: vi.fn(),
        toLightboxImage: (item) => ({ id: item.id, src: `/image/${item.id}` }),
      }),
    );

    act(() => result.current.openScope(selected));
    expect(result.current.lightboxProps.images.map((item) => item.id)).toEqual([2, 4]);
    expect(result.current.lightboxProps.totalCount).toBe(2);
    expect(result.current.lightboxProps.positionOffset).toBe(0);
    expect(result.current.lightboxProps.autoPlay).toBe(true);
    expect(result.current.lightboxProps.hasPrevious).toBe(false);
    expect(result.current.lightboxProps.hasNext).toBe(false);
    expect(result.current.lightboxProps.wrap).toBe(true);
  });

  it("reports the position offset for a later result page", () => {
    const { result } = renderHook(() =>
      usePaginatedImageLightbox({
        items: [image(5, "Fifth"), image(6, "Sixth")],
        filter: { page: 3, perPage: 2 },
        totalCount: 8,
        infinitePageSize: false,
        queryPage: vi.fn(),
        toLightboxImage: (item) => ({ id: item.id, src: `/image/${item.id}` }),
      }),
    );

    act(() => result.current.openImage(5));
    expect(result.current.lightboxProps.positionOffset).toBe(4);
    expect(result.current.lightboxProps.totalCount).toBe(8);
  });

  it("offers more results while its own queue is short of the total, and appends only what is missing", async () => {
    // The list extends itself, so it reports everything it then holds; the lightbox appends the rest.
    const fetchMoreItems = vi.fn().mockResolvedValue([image(1, "First"), image(2, "Second"), image(3, "Third")]);
    const { result } = renderHook(() =>
      usePaginatedImageLightbox({
        items: [image(1, "First"), image(2, "Second")],
        filter: { page: 1, perPage: 0 },
        totalCount: 3,
        infinitePageSize: true,
        queryPage: vi.fn(),
        toLightboxImage: (item) => ({ id: item.id, src: `/image/${item.id}`, title: item.title }),
        fetchMoreItems,
      }),
    );

    act(() => result.current.openImage(2));
    expect(result.current.lightboxProps.hasNext).toBe(true);
    // A partially loaded queue has no end to wrap around in either direction.
    expect(result.current.lightboxProps.wrap).toBe(false);

    let loaded: Awaited<ReturnType<NonNullable<typeof result.current.lightboxProps.loadNext>>> = [];
    await act(async () => {
      loaded = await result.current.lightboxProps.loadNext!();
    });

    expect(fetchMoreItems).toHaveBeenCalledOnce();
    expect(loaded).toEqual([{ id: 3, src: "/image/3", title: "Third" }]);
    // The queue now holds every result, so it becomes cyclic without consulting the list.
    expect(result.current.lightboxProps.hasNext).toBe(false);
    expect(result.current.lightboxProps.wrap).toBe(true);
  });

  it("keeps offering more results after the list finishes loading on its own", async () => {
    // The list raced ahead to all 3 results while the lightbox held a 2-result snapshot. Gating on the
    // list would call the queue complete here and wrap, stranding the result it never received.
    const fetchMoreItems = vi.fn().mockResolvedValue([image(1, "First"), image(2, "Second"), image(3, "Third")]);
    const { result } = renderHook(() =>
      usePaginatedImageLightbox({
        items: [image(1, "First"), image(2, "Second")],
        filter: { page: 1, perPage: 0 },
        totalCount: 3,
        infinitePageSize: true,
        queryPage: vi.fn(),
        toLightboxImage: (item) => ({ id: item.id, src: `/image/${item.id}` }),
        fetchMoreItems,
      }),
    );

    act(() => result.current.openImage(1));
    expect(result.current.lightboxProps.hasNext).toBe(true);
    expect(result.current.lightboxProps.wrap).toBe(false);
  });

  it("stops offering more results once an extension yields nothing new", async () => {
    // An over-reported total must not leave the boundary control live and re-requesting forever.
    const fetchMoreItems = vi.fn().mockResolvedValue([image(1, "First"), image(2, "Second")]);
    const { result } = renderHook(() =>
      usePaginatedImageLightbox({
        items: [image(1, "First"), image(2, "Second")],
        filter: { page: 1, perPage: 0 },
        totalCount: 9,
        infinitePageSize: true,
        queryPage: vi.fn(),
        toLightboxImage: (item) => ({ id: item.id, src: `/image/${item.id}` }),
        fetchMoreItems,
      }),
    );

    act(() => result.current.openImage(1));
    await act(async () => {
      await result.current.lightboxProps.loadNext!();
    });

    expect(result.current.lightboxProps.hasNext).toBe(false);
    expect(result.current.lightboxProps.wrap).toBe(true);
  });

  it("stops offering an adjacent page once one comes back empty", async () => {
    const queryPage = vi.fn().mockResolvedValue({ items: [], totalCount: 131 });
    const { result } = renderHook(() =>
      usePaginatedImageLightbox({
        items: [image(61, "Sixty-first")],
        filter: { page: 2, perPage: 60 },
        totalCount: 131,
        infinitePageSize: false,
        queryPage,
        toLightboxImage: (item) => ({ id: item.id, src: `/image/${item.id}` }),
      }),
    );

    act(() => result.current.openImage(61));
    expect(result.current.lightboxProps.hasNext).toBe(true);

    await act(async () => {
      await result.current.lightboxProps.loadNext!();
    });

    // The page bounds must not advance past an empty page, and the control must not keep re-issuing it.
    expect(result.current.lightboxProps.positionOffset).toBe(60);
    expect(result.current.lightboxProps.hasNext).toBe(false);
    expect(queryPage).toHaveBeenCalledOnce();
  });
});

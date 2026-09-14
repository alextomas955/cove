import { useCallback, useMemo, useRef, useState } from "react";
import type { FindFilter, Image, PaginatedResponse } from "../api/types";
import type { LightboxImage, LightboxProps } from "../components/Lightbox";
import { extendLightboxPageBounds } from "../utils/lightboxPagination";

interface UsePaginatedImageLightboxOptions {
  items: Image[];
  filter: FindFilter;
  totalCount: number;
  infinitePageSize: boolean;
  queryPage: (filter: FindFilter) => Promise<PaginatedResponse<Image>>;
  toLightboxImage: (image: Image) => LightboxImage;
  /**
   * Extends an infinite list by one page and resolves with every result it then holds, or with no
   * results when it cannot be extended. Without it an infinite list stays a cyclic loaded queue.
   */
  fetchMoreItems?: () => Promise<Image[]>;
}

export function usePaginatedImageLightbox({
  items,
  filter,
  totalCount,
  infinitePageSize,
  queryPage,
  toLightboxImage,
  fetchMoreItems,
}: UsePaginatedImageLightboxOptions) {
  const [open, setOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [scopeItems, setScopeItems] = useState<Image[] | null>(null);
  const [pageBounds, setPageBounds] = useState(() => ({ first: filter.page ?? 1, last: filter.page ?? 1 }));
  // A page or extension that yields nothing has reached the end of what the list can serve, whatever
  // the advertised total says. Without this the boundary controls stay live and re-issue it forever.
  const [exhausted, setExhausted] = useState({ previous: false, next: false });
  // How many results the lightbox queue holds, and which ones. The queue is a snapshot taken when the
  // lightbox opened, so its own contents — not the list's current length — decide whether it is
  // complete: the list may load further pages on its own while the lightbox is detached from it.
  const [queuedCount, setQueuedCount] = useState(0);
  const queuedImageIds = useRef(new Set<number>());
  const sourceItems = scopeItems ?? items;
  const lightboxImages = useMemo(() => sourceItems.map(toLightboxImage), [sourceItems, toLightboxImage]);

  const startSession = useCallback((queued: Image[]) => {
    queuedImageIds.current = new Set(queued.map((image) => image.id));
    setQueuedCount(queued.length);
    setExhausted({ previous: false, next: false });
  }, []);

  const openImage = useCallback(
    (imageId: number) => {
      setScopeItems(null);
      setPageBounds({ first: filter.page ?? 1, last: filter.page ?? 1 });
      startSession(items);
      setAutoPlay(false);
      setInitialIndex(
        Math.max(
          0,
          items.findIndex((image) => image.id === imageId),
        ),
      );
      setOpen(true);
    },
    [filter.page, items, startSession],
  );

  const openScope = useCallback(
    (images: Image[], shouldAutoPlay = images.length > 1) => {
      if (images.length === 0) return;
      startSession(images);
      setScopeItems(images);
      setInitialIndex(0);
      setAutoPlay(shouldAutoPlay);
      setOpen(true);
    },
    [startSession],
  );

  const close = useCallback(() => {
    setOpen(false);
    setAutoPlay(false);
    setScopeItems(null);
  }, []);

  const loadPage = useCallback(
    async (page: number, direction: "previous" | "next") => {
      const response = await queryPage({ ...filter, page });
      if (response.items.length === 0) {
        setExhausted((current) => ({ ...current, [direction]: true }));
        return [];
      }

      setPageBounds((bounds) => extendLightboxPageBounds(bounds, page, direction));
      setQueuedCount((count) => count + response.items.length);
      return response.items.map(toLightboxImage);
    },
    [filter, queryPage, toLightboxImage],
  );

  // An infinite list hands the lightbox only the results scrolled into view so far. Extend the list
  // itself rather than querying around it, so the list and the lightbox share one loaded queue, and
  // append whatever that leaves the lightbox missing.
  const loadMoreItems = useCallback(async () => {
    if (!fetchMoreItems) return [];
    const known = await fetchMoreItems();
    const fresh = known.filter((image) => !queuedImageIds.current.has(image.id));
    if (fresh.length === 0) {
      setExhausted((current) => ({ ...current, next: true }));
      return [];
    }

    for (const image of fresh) queuedImageIds.current.add(image.id);
    setQueuedCount((count) => count + fresh.length);
    return fresh.map(toLightboxImage);
  }, [fetchMoreItems, toLightboxImage]);

  const paged = scopeItems === null && !infinitePageSize;
  // Gate on the lightbox's own queue rather than the list's loading state: the list can finish loading
  // independently while the lightbox holds an older, shorter snapshot of it.
  const canLoadMore =
    scopeItems === null && infinitePageSize && Boolean(fetchMoreItems) && !exhausted.next && queuedCount < totalCount;
  const pageSize = filter.perPage || 40;

  const lightboxProps: Pick<
    LightboxProps,
    | "images"
    | "initialIndex"
    | "open"
    | "onClose"
    | "autoPlay"
    | "hasPrevious"
    | "hasNext"
    | "loadPrevious"
    | "loadNext"
    | "wrap"
    | "totalCount"
    | "positionOffset"
  > = {
    images: lightboxImages,
    initialIndex,
    open,
    onClose: close,
    autoPlay,
    hasPrevious: paged && !exhausted.previous && pageBounds.first > 1,
    hasNext: infinitePageSize ? canLoadMore : paged && !exhausted.next && pageBounds.last * pageSize < totalCount,
    loadPrevious: () => loadPage(pageBounds.first - 1, "previous"),
    loadNext: infinitePageSize ? loadMoreItems : () => loadPage(pageBounds.last + 1, "next"),
    // A partially loaded infinite list has no end to wrap around: its last queued result is not the
    // last result, and neither is its first the first once navigation has run past the queue. Wrapping
    // resumes once the queue holds every result, or once the list turns out not to be extensible.
    wrap: scopeItems !== null || (infinitePageSize && !canLoadMore),
    totalCount: scopeItems?.length ?? totalCount,
    positionOffset: paged ? (pageBounds.first - 1) * pageSize : 0,
  };

  return { openImage, openScope, lightboxProps };
}

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  invalidateGalleriesForVideoLinkChange,
  invalidateVideosForGalleryLinkChange,
} from "../utils/galleryVideoLinks";

function spyOnInvalidate() {
  const queryClient = new QueryClient();
  return { queryClient, invalidateQueries: vi.spyOn(queryClient, "invalidateQueries") };
}

describe("galleryVideoLinks", () => {
  it("refreshes galleries a video was linked to or unlinked from", () => {
    const { queryClient, invalidateQueries } = spyOnInvalidate();

    invalidateGalleriesForVideoLinkChange(queryClient, [3, 5], [5, 7]);

    expect(invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ["gallery", 7],
      ["gallery-videos", 7],
      ["gallery", 3],
      ["gallery-videos", 3],
    ]);
  });

  it("refreshes videos a gallery was linked to or unlinked from", () => {
    const { queryClient, invalidateQueries } = spyOnInvalidate();

    invalidateVideosForGalleryLinkChange(queryClient, [14, 20], [20, 22]);

    expect(invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ["video", 22],
      ["video", 14],
    ]);
  });

  it("refreshes nothing when the links are unchanged", () => {
    const { queryClient, invalidateQueries } = spyOnInvalidate();

    invalidateGalleriesForVideoLinkChange(queryClient, [3, 5], [5, 3]);
    invalidateVideosForGalleryLinkChange(queryClient, [], []);

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

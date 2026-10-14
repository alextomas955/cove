import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidateImageMetadataQueries } from "../components/imageMetadataQueryInvalidation";

describe("invalidateImageMetadataQueries", () => {
  it("invalidates every cached list that shows the saved image", async () => {
    const queryClient = new QueryClient();
    const affectedQueryKeys = [
      ["image", 42],
      ["images", {}, "standard", "page", { page: 1, perPage: 40 }],
      ["gallery-images", 4, {}, "infinite", { page: 1, perPage: 60 }],
      ["performer-images", 7, {}, "page", { page: 1 }],
      ["studio-images", 8, false, {}, "page", { page: 1 }],
      ["tag-images", 9, {}, false, "page", { page: 1 }],
      ["group-items", 5],
      ["group-mixed-items", 5, "2026-01-01", null, null, "static", {}, "page", { page: 1 }],
      ["group-items-page-all", "unbounded-v2", 5, "2026-01-01", null, null],
      ["group-items-popover", 5, "image"],
      ["front-page-group-items", "user:1", 5],
      ["group-item-host", "image", 42],
      ["group-feed", "user:1", "items", 5, 20],
      ["group-feed", "user:1", "host", "image", 42, "2026-01-01"],
    ] as const;
    const unaffectedQueryKeys = [
      ["image", 43],
      ["group-item-host", "image", 43],
      ["group-feed", "user:1", "host", "image", 43, "2026-01-01"],
      ["group-feed", "user:1", "host", "video", 42, "2026-01-01"],
      ["group-feed", "user:1", "group", 5],
      ["videos", { page: 1 }],
    ] as const;

    for (const queryKey of [...affectedQueryKeys, ...unaffectedQueryKeys]) {
      queryClient.setQueryData(queryKey, { cached: true });
    }

    await invalidateImageMetadataQueries(queryClient, 42);

    for (const queryKey of affectedQueryKeys) {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated, JSON.stringify(queryKey)).toBe(true);
    }
    for (const queryKey of unaffectedQueryKeys) {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated, JSON.stringify(queryKey)).toBe(false);
    }
  });
});

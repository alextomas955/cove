import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Detail pages and group views cache image lists under their own keys, so a saved image must refresh those too.
const RELATED_IMAGE_QUERY_PREFIXES: QueryKey[] = [
  ["images"],
  ["gallery-images"],
  ["performer-images"],
  ["studio-images"],
  ["tag-images"],
  ["group-items"],
  ["group-items-page-all"],
  ["group-mixed-items"],
  ["group-items-popover"],
  ["front-page-group-items"],
];

export async function invalidateImageMetadataQueries(queryClient: QueryClient, imageId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["image", imageId] }),
    queryClient.invalidateQueries({ queryKey: ["group-item-host", "image", imageId] }),
    // Feed hosts are keyed by the group item's updatedAt, which an image edit does not change.
    queryClient.invalidateQueries({
      queryKey: ["group-feed"],
      predicate: (query) =>
        query.queryKey[2] === "items" ||
        (query.queryKey[2] === "host" && query.queryKey[3] === "image" && query.queryKey[4] === imageId),
    }),
    ...RELATED_IMAGE_QUERY_PREFIXES.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  ]);
}

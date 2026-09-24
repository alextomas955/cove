import type { QueryClient, QueryKey } from "@tanstack/react-query";

const RELATED_VIDEO_QUERY_PREFIXES: QueryKey[] = [
  ["videos"],
  ["videos-popover"],
  ["performer-videos"],
  ["performer-appears-with"],
  ["performers-popover"],
  ["studio-videos"],
  ["studio-performers"],
  ["studios-popover"],
  ["tag-videos"],
  ["performer"],
  ["performers"],
  ["studio"],
  ["studios"],
  ["tag"],
  ["tags"],
];

export async function invalidateVideoMetadataQueries(queryClient: QueryClient, videoId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["video", videoId] }),
    // A cover that has just been replaced is no longer the cover the tagger compared against.
    queryClient.invalidateQueries({ queryKey: ["video-cover-comparison", videoId] }),
    ...RELATED_VIDEO_QUERY_PREFIXES.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  ]);
}

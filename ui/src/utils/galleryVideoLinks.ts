import type { QueryClient } from "@tanstack/react-query";

// A video's gallery links are editable from both the video and the gallery, and each editor resaves
// its full link list. After one side changes links, refresh the other side's cached pages so its
// editor does not resave the old links.

/** Ids present in exactly one of the two lists: the entities an edit linked or unlinked. */
function changedIds(before: readonly number[], after: readonly number[]): number[] {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return [...new Set([...after.filter((id) => !beforeSet.has(id)), ...before.filter((id) => !afterSet.has(id))])];
}

export function invalidateGalleriesForVideoLinkChange(
  queryClient: QueryClient,
  beforeGalleryIds: readonly number[],
  afterGalleryIds: readonly number[],
) {
  for (const galleryId of changedIds(beforeGalleryIds, afterGalleryIds)) {
    queryClient.invalidateQueries({ queryKey: ["gallery", galleryId] });
    queryClient.invalidateQueries({ queryKey: ["gallery-videos", galleryId] });
  }
}

export function invalidateVideosForGalleryLinkChange(
  queryClient: QueryClient,
  beforeVideoIds: readonly number[],
  afterVideoIds: readonly number[],
) {
  for (const videoId of changedIds(beforeVideoIds, afterVideoIds)) {
    queryClient.invalidateQueries({ queryKey: ["video", videoId] });
  }
}

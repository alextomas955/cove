import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { entityImages, tags as tagsApi } from "../api/client";
import type { Tag, TagLookupEntry } from "../api/types";

/**
 * List entries carry their tags as ids (`tagIds`) and detail responses as full `tags`. Cards, chips and
 * rows render through these helpers so either shape works: ids are resolved through one lookup of
 * every readable tag, fetched once per session and refreshed whenever tags change.
 */
export interface TaggedEntity {
  tags?: Tag[];
  tagIds?: number[];
}

export function hasTagIds(entity: TaggedEntity): entity is TaggedEntity & { tagIds: number[] } {
  return Array.isArray(entity.tagIds);
}

/** How many tags an entity has, without needing the lookup. */
export function entityTagCount(entity: TaggedEntity): number {
  return hasTagIds(entity) ? entity.tagIds.length : (entity.tags?.length ?? 0);
}

export type TagLookup = Map<number, TagLookupEntry>;

export function useTagLookup(enabled = true) {
  const query = useQuery({
    // Under the "tags" root, so every tag edit and job completion that invalidates tags refreshes it.
    queryKey: ["tags", "lookup"],
    queryFn: tagsApi.lookup,
    staleTime: 5 * 60_000,
    enabled,
  });
  const lookup = useMemo<TagLookup | undefined>(
    () => (query.data ? new Map(query.data.map((tag) => [tag.id, tag])) : undefined),
    [query.data],
  );
  return { lookup, isLoading: query.isLoading };
}

const naturalCompare = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;

/** The display order the server gives detail tags: grouped tags first by group order and name, then by name. */
export function orderTagsForDisplay<T extends Pick<Tag, "id" | "name" | "tagGroupId" | "tagGroupName" | "tagGroupSortOrder" | "sortName">>(
  tags: T[],
): T[] {
  return [...tags].sort(
    (a, b) =>
      Number(a.tagGroupId == null) - Number(b.tagGroupId == null) ||
      (a.tagGroupSortOrder ?? Number.MAX_SAFE_INTEGER) - (b.tagGroupSortOrder ?? Number.MAX_SAFE_INTEGER) ||
      naturalCompare(a.tagGroupName ?? "", b.tagGroupName ?? "") ||
      naturalCompare(a.sortName ?? a.name, b.sortName ?? b.name) ||
      a.id - b.id,
  );
}

export function tagFromLookup(entry: TagLookupEntry): Tag {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description ?? undefined,
    color: entry.color,
    tagGroupId: entry.tagGroupId,
    tagGroupName: entry.tagGroupName,
    tagGroupColor: entry.tagGroupColor,
    tagGroupSortOrder: entry.tagGroupSortOrder,
    sortName: entry.sortName,
    favorite: entry.favorite,
    hasImage: entry.hasImage,
    imagePath: entry.hasImage ? entityImages.tagImageUrl(entry.id) : undefined,
    organized: false,
    aliases: [],
  };
}

/** The entity's tags in display order: its own on a detail response, resolved from the lookup on a list entry. */
export function resolveEntityTags(entity: TaggedEntity, lookup: TagLookup | undefined): Tag[] {
  if (!hasTagIds(entity)) return entity.tags ?? [];
  if (!lookup) return [];
  // A tag the lookup lacks was deleted or is not readable; the entry just shows without it.
  return orderTagsForDisplay(entity.tagIds.flatMap((id) => (lookup.has(id) ? [tagFromLookup(lookup.get(id)!)] : [])));
}

/** The entity's tags for rendering. Only a list entry (which has `tagIds`) fetches the lookup. */
export function useEntityTags(entity: TaggedEntity): Tag[] {
  const { lookup } = useTagLookup(hasTagIds(entity));
  return useMemo(() => resolveEntityTags(entity, lookup), [entity, lookup]);
}

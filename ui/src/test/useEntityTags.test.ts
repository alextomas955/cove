import { describe, expect, it } from "vitest";
import { entityTagCount, orderTagsForDisplay, resolveEntityTags, type TagLookup } from "../hooks/useEntityTags";
import type { Tag, TagLookupEntry } from "../api/types";

const entry = (id: number, name: string, extra: Partial<TagLookupEntry> = {}): TagLookupEntry => ({
  id,
  name,
  favorite: false,
  hasImage: false,
  ...extra,
});
const tag = (id: number, name: string): Tag => ({ id, name, favorite: false, organized: false, aliases: [] });

describe("entity tags", () => {
  it("counts a list entry's tag ids without the lookup and a detail entity's tags directly", () => {
    expect(entityTagCount({ tags: [], tagIds: [4, 7, 9] })).toBe(3);
    expect(entityTagCount({ tags: [tag(1, "a")] })).toBe(1);
    expect(entityTagCount({})).toBe(0);
  });

  it("resolves a list entry's ids through the lookup, skipping ids it lacks", () => {
    const lookup: TagLookup = new Map([
      [4, entry(4, "Outdoor", { color: "#0f0", hasImage: true })],
      [7, entry(7, "Night")],
    ]);
    const tags = resolveEntityTags({ tags: [], tagIds: [7, 4, 99] }, lookup);
    expect(tags.map((t) => t.name)).toEqual(["Night", "Outdoor"]);
    expect(tags[1]).toMatchObject({ color: "#0f0", hasImage: true, imagePath: expect.stringContaining("/api/tags/4/image") });
  });

  it("returns nothing for a list entry until the lookup has loaded, and a detail entity's own tags as given", () => {
    expect(resolveEntityTags({ tags: [], tagIds: [1] }, undefined)).toEqual([]);
    const own = [tag(2, "b"), tag(1, "a")];
    expect(resolveEntityTags({ tags: own }, undefined)).toBe(own);
  });

  it("orders like the server: grouped tags first by group order and name, then by name, numbers naturally", () => {
    const ordered = orderTagsForDisplay([
      tag(1, "Zebra"),
      { ...tag(2, "Beta"), tagGroupId: 1, tagGroupName: "Setting", tagGroupSortOrder: 2 },
      { ...tag(3, "Alpha"), tagGroupId: 2, tagGroupName: "Mood", tagGroupSortOrder: 1 },
      tag(4, "Scene 10"),
      tag(5, "Scene 2"),
    ]);
    expect(ordered.map((t) => t.name)).toEqual(["Alpha", "Beta", "Scene 2", "Scene 10", "Zebra"]);
  });
});

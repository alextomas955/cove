import type { Tag } from "../api/types";
import type { EntityReferenceOption } from "../components/EntityReferenceSelector";

export function getEditableTagIds(tags: Pick<Tag, "id" | "canRemove">[]): number[] {
  return tags.filter((tag) => tag.canRemove !== false).map((tag) => tag.id);
}

export function getLockedTagIds(tags: Pick<Tag, "id" | "canRemove">[]): number[] {
  return tags.filter((tag) => tag.canRemove === false).map((tag) => tag.id);
}

export function mergeTagIds(...groups: number[][]): number[] {
  return Array.from(new Set(groups.flat().filter((id) => Number.isInteger(id) && id > 0)));
}

/** A tag as a selector option, carrying its colors so its chip matches its badge elsewhere. */
export function toTagOption(
  tag: Pick<Tag, "id" | "name" | "color" | "tagGroupColor" | "tagGroupName"> &
    Partial<Pick<Tag, "favorite" | "description" | "imagePath" | "hasImage" | "aliases">>,
): EntityReferenceOption {
  return {
    id: tag.id,
    label: tag.name,
    favorite: tag.favorite,
    tagColor: tag.color,
    tagGroupColor: tag.tagGroupColor,
    tagGroupName: tag.tagGroupName,
    tagDescription: tag.description,
    tagImagePath: tag.imagePath,
    tagHasImage: tag.hasImage,
    aliases: tag.aliases,
  };
}

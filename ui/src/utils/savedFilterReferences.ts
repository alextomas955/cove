import {
  audios as audiosApi,
  galleries as galleriesApi,
  groups as groupsApi,
  performers as performersApi,
  studios as studiosApi,
  tagGroups as tagGroupsApi,
  tags as tagsApi,
  videos as videosApi,
} from "../api/client";
import type {
  AudioFilterCriteria,
  GalleryFilterCriteria,
  GroupFilterCriteria,
  PaginatedResponse,
  PerformerFilterCriteria,
  StringCriterion,
  StudioFilterCriteria,
  TagFilterCriteria,
  VideoFilterCriteria,
} from "../api/types";
import type { EntityType } from "../components/filterCriteriaTypes";
import type { PortableEntityReference, PortableRemoteId, ResolvedEntityReference } from "./portableSavedFilter";

/** Entity types an import may create when nothing in this library matches. */
export const CREATABLE_REFERENCE_TYPES: ReadonlySet<EntityType> = new Set<EntityType>([
  "tags",
  "performers",
  "studios",
]);

export interface MatchedEntityReference extends ResolvedEntityReference {
  matchedBy: "remoteId" | "name";
}

interface NamedEntity {
  id: number;
  name?: string;
  title?: string;
  disambiguation?: string;
  aliases?: string[] | string;
  remoteIds?: PortableRemoteId[];
}

const equalsCriterion = (value: string): StringCriterion => ({ value, modifier: "EQUALS" });

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The server compares EQUALS exactly but runs regular expressions case-insensitively, and names are unique ignoring
// case, so an anchored expression finds the one entity a case variant would collide with on create.
const sameNameCriterion = (value: string): StringCriterion => ({
  value: `^${escapeRegex(value.trim())}$`,
  modifier: "MATCHES_REGEX",
});

function sameText(a: string | undefined, b: string | undefined) {
  return (a ?? "").trim().toLocaleLowerCase() === (b ?? "").trim().toLocaleLowerCase();
}

function portableRemoteIds(remoteIds: PortableRemoteId[] | undefined) {
  const result = (remoteIds ?? []).map(({ endpoint, remoteId }) => ({ endpoint, remoteId }));
  return result.length > 0 ? { remoteIds: result } : {};
}

function reference(
  entityType: EntityType,
  name: string | undefined,
  extra: Omit<PortableEntityReference, "$ref" | "name"> = {},
): PortableEntityReference | null {
  const trimmed = name?.trim();
  // An untitled gallery, video or audio has nothing another library could match it by.
  return trimmed ? { $ref: entityType, name: trimmed, ...extra } : null;
}

function isNotFound(error: unknown) {
  return error instanceof Error && error.message.startsWith("API Error 404");
}

/**
 * Describes a local entity portably, or returns null when it no longer exists or has nothing (such as a title)
 * another library could identify it by. Any other failure is thrown so an export never silently loses an item.
 */
export async function describeEntityReference(
  entityType: EntityType,
  id: number,
): Promise<PortableEntityReference | null> {
  try {
    switch (entityType) {
      case "tags": {
        const tag = await tagsApi.get(id);
        return reference(entityType, tag.name, portableRemoteIds(tag.remoteIds));
      }
      case "performers": {
        const performer = await performersApi.get(id);
        return reference(entityType, performer.name, {
          ...(performer.disambiguation?.trim() ? { disambiguation: performer.disambiguation.trim() } : {}),
          ...portableRemoteIds(performer.remoteIds),
        });
      }
      case "studios": {
        const studio = await studiosApi.get(id);
        return reference(entityType, studio.name, portableRemoteIds(studio.remoteIds));
      }
      case "videos": {
        const video = await videosApi.get(id);
        return reference(entityType, video.title, portableRemoteIds(video.remoteIds));
      }
      case "tagGroups":
        return reference(entityType, (await tagGroupsApi.get(id)).name);
      case "groups":
        return reference(entityType, (await groupsApi.get(id)).name);
      case "galleries":
        return reference(entityType, (await galleriesApi.get(id)).title);
      case "audios":
        return reference(entityType, (await audiosApi.get(id)).title);
      case "faces":
        return null;
    }
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

type Finder = (objectFilter: Record<string, unknown>) => Promise<PaginatedResponse<NamedEntity>>;

function finderFor(entityType: EntityType): Finder | null {
  const findFilter = { perPage: 25 };
  switch (entityType) {
    case "tags":
      return (objectFilter) => tagsApi.findFiltered({ findFilter, objectFilter: objectFilter as TagFilterCriteria });
    case "performers":
      return (objectFilter) =>
        performersApi.findFiltered({ findFilter, objectFilter: objectFilter as PerformerFilterCriteria });
    case "studios":
      return (objectFilter) =>
        studiosApi.findFiltered({ findFilter, objectFilter: objectFilter as StudioFilterCriteria });
    case "groups":
      return (objectFilter) =>
        groupsApi.findFiltered({ findFilter, objectFilter: objectFilter as GroupFilterCriteria });
    case "galleries":
      return (objectFilter) =>
        galleriesApi.findFiltered({ findFilter, objectFilter: objectFilter as GalleryFilterCriteria });
    case "videos":
      return (objectFilter) =>
        videosApi.findFiltered({ findFilter, objectFilter: objectFilter as VideoFilterCriteria });
    case "audios":
      return (objectFilter) =>
        audiosApi.findFiltered({ findFilter, objectFilter: objectFilter as AudioFilterCriteria });
    default:
      return null;
  }
}

const REMOTE_ID_TYPES: ReadonlySet<EntityType> = new Set<EntityType>(["tags", "performers", "studios", "videos"]);
const ALIAS_TYPES: ReadonlySet<EntityType> = new Set<EntityType>(["tags", "performers", "studios", "groups"]);
const TITLED_TYPES: ReadonlySet<EntityType> = new Set<EntityType>(["galleries", "videos", "audios"]);

const displayName = (entity: NamedEntity) => (entity.name ?? entity.title ?? "").trim();

function aliasesOf(entity: NamedEntity) {
  if (Array.isArray(entity.aliases)) return entity.aliases;
  return (entity.aliases ?? "").split(",");
}

function single<T>(items: T[]) {
  return items.length === 1 ? items[0] : null;
}

/**
 * Finds the local entity an imported reference names: first by a remote ID on the same endpoint, then by a single
 * exact name (or alias) match. Ambiguous names resolve to nothing rather than to an arbitrary entity.
 */
export async function matchEntityReference(reference: PortableEntityReference): Promise<MatchedEntityReference | null> {
  const entityType = reference.$ref;

  if (entityType === "tagGroups") {
    const match = single((await tagGroupsApi.list()).filter((group) => sameText(group.name, reference.name)));
    return match ? { id: match.id, name: match.name, matchedBy: "name" } : null;
  }

  const find = finderFor(entityType);
  if (!find) return null;

  if (REMOTE_ID_TYPES.has(entityType)) {
    for (const { endpoint, remoteId } of reference.remoteIds ?? []) {
      const { items } = await find({
        remoteIdCriterion: equalsCriterion(endpoint),
        remoteIdValueCriterion: equalsCriterion(remoteId),
      });
      const match = single(items);
      if (match) return { id: match.id, name: displayName(match), matchedBy: "remoteId" };
    }
  }

  const nameKey = TITLED_TYPES.has(entityType) ? "titleCriterion" : "nameCriterion";
  const sameDisambiguation = (entity: NamedEntity) =>
    entityType !== "performers" || sameText(entity.disambiguation, reference.disambiguation);
  const byName = (await find({ [nameKey]: sameNameCriterion(reference.name) })).items.filter(
    (entity) => sameText(displayName(entity), reference.name) && sameDisambiguation(entity),
  );
  let match = single(byName);
  if (!match && byName.length === 0 && ALIAS_TYPES.has(entityType)) {
    // Group aliases are one comma-separated string; the others are matched alias by alias.
    const aliasCriterion: StringCriterion =
      entityType === "groups"
        ? { value: `(^|,)\\s*${escapeRegex(reference.name.trim())}\\s*(,|$)`, modifier: "MATCHES_REGEX" }
        : sameNameCriterion(reference.name);
    const byAlias = (await find({ aliasesCriterion: aliasCriterion })).items.filter(
      (entity) => aliasesOf(entity).some((alias) => sameText(alias, reference.name)) && sameDisambiguation(entity),
    );
    match = single(byAlias);
  }
  return match ? { id: match.id, name: displayName(match), matchedBy: "name" } : null;
}

/** Creates a missing tag, performer or studio with the name and remote IDs the export carried. */
export async function createEntityFromReference(reference: PortableEntityReference): Promise<ResolvedEntityReference> {
  const remoteIds = portableRemoteIds(reference.remoteIds);
  switch (reference.$ref) {
    case "tags": {
      const tag = await tagsApi.create({ name: reference.name, ...remoteIds });
      return { id: tag.id, name: tag.name };
    }
    case "performers": {
      const performer = await performersApi.create({
        name: reference.name,
        ...(reference.disambiguation ? { disambiguation: reference.disambiguation } : {}),
        ...remoteIds,
      });
      return { id: performer.id, name: performer.name };
    }
    case "studios": {
      const studio = await studiosApi.create({ name: reference.name, ...remoteIds });
      return { id: studio.id, name: studio.name };
    }
    default:
      throw new Error(`Cannot create a ${reference.$ref} entry from a saved filter.`);
  }
}

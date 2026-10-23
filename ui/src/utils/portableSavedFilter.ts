import type { FindFilter, SavedFilter, SavedFilterUIOptions } from "../api/types";
import type { CriterionDefinition, EntityType } from "../components/filterCriteriaTypes";
import { extensionFilterKey } from "../extensions/extensionListFilters";
import { FILTER_EXPRESSION_STATE_KEY, repairRelatedScopes } from "./filterExpressionTree";
import type { FilterExpression } from "../api/types";

/**
 * A saved filter in a form another Cove instance can import. Local database IDs are meaningless elsewhere, so every
 * entity a criterion points at is written as a reference carrying the entity's name and remote IDs instead.
 *
 * Both directions walk the filter with the list's criterion definitions, so they agree on where entity IDs live.
 * Anything the walk cannot account for is left out and reported rather than copied, since it could hold local IDs.
 */
export const PORTABLE_SAVED_FILTER_FORMAT = "cove.savedFilter";
export const PORTABLE_SAVED_FILTER_VERSION = 1;

const REFERENCE_KEY = "$ref";
const CUSTOM_FIELD_CRITERIA_KEY = "customFieldCriteria";
const EXTENSION_CRITERIA_KEY = "extensionCriteria";
const CRITERION_ID_ARRAY_KEYS = ["value", "excludes", "requiredIds"] as const;
const NULL_MODIFIERS = new Set(["IS_NULL", "NOT_NULL"]);
// Client-only display hints keyed by local ID; the receiving library looks names up again.
const LOCAL_NAME_HINT_KEYS = new Set(["_names", "displayValue", "displayValue2"]);

const ENTITY_TYPES: ReadonlySet<string> = new Set<EntityType>([
  "tags",
  "tagGroups",
  "performers",
  "studios",
  "groups",
  "galleries",
  "videos",
  "audios",
  "faces",
]);

// Reference-typed custom fields store the referenced entity's ID as their value. Image references have no portable
// identity, so a condition on one is left out.
const CUSTOM_FIELD_ENTITY_TYPES: Readonly<Record<string, EntityType | null>> = {
  tag: "tags",
  performer: "performers",
  studio: "studios",
  group: "groups",
  gallery: "galleries",
  video: "videos",
  image: null,
};

// Entity-scoped keys older filters and API clients still send outside any criterion.
const LEGACY_ID_KEYS: Readonly<Record<string, EntityType>> = {
  studioId: "studios",
  parentStudioId: "studios",
  tagIds: "tags",
  performerIds: "performers",
  groupId: "groups",
  galleryId: "galleries",
};

// `ids` restricts a list to specific items of its own kind (CLI worklists save these).
const LIST_ENTITY_TYPES: Readonly<Record<string, EntityType>> = {
  videos: "videos",
  performers: "performers",
  studios: "studios",
  tags: "tags",
  groups: "groups",
  galleries: "galleries",
  audios: "audios",
};

export interface PortableRemoteId {
  endpoint: string;
  remoteId: string;
}

export interface PortableEntityReference {
  [REFERENCE_KEY]: EntityType;
  name: string;
  disambiguation?: string;
  remoteIds?: PortableRemoteId[];
}

export interface PortableSavedFilter {
  format: typeof PORTABLE_SAVED_FILTER_FORMAT;
  version: typeof PORTABLE_SAVED_FILTER_VERSION;
  mode: string;
  name: string;
  findFilter?: FindFilter;
  objectFilter?: Record<string, unknown>;
  uiOptions?: SavedFilterUIOptions;
}

export interface EntityIdReference {
  entityType: EntityType;
  id: number;
}

export interface ResolvedEntityReference {
  id: number;
  name: string;
}

/** Returned by a mapper to leave an entity out of the converted filter. */
const DROP = Symbol("drop");
/** Returned by the walk for a condition that no longer names anything and must not be kept in a widened form. */
const PRUNE = Symbol("prune");

type Mapped = { value: unknown; label?: string } | typeof DROP;
type Mapper = (entityType: EntityType, raw: unknown) => Mapped;

interface Walk {
  map: Mapper;
  /** Conditions left out because they cannot be expressed portably here. */
  omitted: string[];
  /** Counts entities and conditions removed; a container that lost something and is now empty is removed too. */
  removals: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

export function entityReferenceKey(entityType: EntityType, id: number) {
  return `${entityType}:${id}`;
}

function omit(walk: Walk, label: string) {
  walk.omitted.push(label);
  walk.removals += 1;
}

function mapItem(walk: Walk, entityType: EntityType, raw: unknown): Mapped {
  const mapped = walk.map(entityType, raw);
  if (mapped === DROP) walk.removals += 1;
  return mapped;
}

function mapIdArray(walk: Walk, entityType: EntityType, value: unknown): unknown {
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap((item) => {
    const mapped = mapItem(walk, entityType, item);
    return mapped === DROP ? [] : [mapped.value];
  });
}

function withoutNameHints(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !LOCAL_NAME_HINT_KEYS.has(key))
      .map(([key, child]) => [key, structuredClone(child)]),
  );
}

function transformMultiId(walk: Walk, value: Record<string, unknown>, entityType: EntityType): unknown {
  const removalsBefore = walk.removals;
  const result = withoutNameHints(value);
  for (const key of CRITERION_ID_ARRAY_KEYS) {
    if (key in value) result[key] = mapIdArray(walk, entityType, value[key]);
  }
  const namesNothing = CRITERION_ID_ARRAY_KEYS.every((key) => !Array.isArray(result[key]) || result[key].length === 0);
  if (walk.removals > removalsBefore && namesNothing && !NULL_MODIFIERS.has(String(result.modifier))) return PRUNE;
  return result;
}

function transformTagDuration(walk: Walk, value: Record<string, unknown>): unknown {
  const removalsBefore = walk.removals;
  const result = withoutNameHints(value);
  const mapTagId = (source: Record<string, unknown>, target: Record<string, unknown>) => {
    if (!("tagId" in source) || source.tagId == null) return true;
    const mapped = mapItem(walk, "tags", source.tagId);
    if (mapped === DROP) return false;
    target.tagId = mapped.value;
    return true;
  };
  const keepsRootTag = mapTagId(value, result);
  if (!keepsRootTag) delete result.tagId;
  if (Array.isArray(value.clauses)) {
    result.clauses = value.clauses.flatMap((clause) => {
      if (!isRecord(clause)) {
        walk.removals += 1;
        return [];
      }
      const mapped = withoutNameHints(clause);
      return mapTagId(clause, mapped) ? [mapped] : [];
    });
  }
  const hasClauses = Array.isArray(result.clauses) && result.clauses.length > 0;
  // The server evaluates clauses when there are any and the root tag only otherwise, so losing every clause would
  // promote a root tag the original filter ignored.
  const hadClauses = Array.isArray(value.clauses) && value.clauses.length > 0;
  if (walk.removals > removalsBefore && !hasClauses && (hadClauses || !keepsRootTag || !("tagId" in value)))
    return PRUNE;
  return result;
}

const RELATED_OPTION_KEYS = new Set([
  "findFilter",
  "mode",
  "conditionOperator",
  "exclude",
  "_savedFilterName",
  "_matchAll",
]);

function transformRelated(walk: Walk, value: Record<string, unknown>, definition: CriterionDefinition): unknown {
  const removalsBefore = walk.removals;
  const result: Record<string, unknown> = {};
  const contexts = new Map((definition.relatedContextCriteria ?? []).map((context) => [context.filterKey, context]));
  for (const [key, child] of Object.entries(value)) {
    const context = contexts.get(key);
    if (key === "objectFilter") {
      const objectFilter = transformFilter(walk, child, definition.relatedCriteria?.() ?? []);
      if (Object.keys(objectFilter).length > 0 || walk.removals === removalsBefore) result[key] = objectFilter;
    } else if (context) {
      const mapped = transformCriterion(walk, child, context);
      if (mapped !== PRUNE) result[key] = mapped;
    } else if (RELATED_OPTION_KEYS.has(key)) {
      result[key] = structuredClone(child);
    } else {
      omit(walk, `${definition.label} “${key}”`);
    }
  }
  // A related condition left with nothing to test would match any (or, with "none", no) related item.
  const testsSomething =
    (isRecord(result.objectFilter) && Object.keys(result.objectFilter).length > 0) ||
    result._matchAll === true ||
    (isRecord(result.findFilter) && typeof result.findFilter.q === "string" && result.findFilter.q.trim() !== "") ||
    [...contexts.keys()].some((key) => key in result);
  return walk.removals > removalsBefore && !testsSomething ? PRUNE : result;
}

const ID_BEARING_TYPES: ReadonlySet<string> = new Set(["multiId", "tagDuration", "related"]);

function transformCriterion(walk: Walk, value: unknown, definition: CriterionDefinition): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => transformCriterion(walk, item, definition)).filter((item) => item !== PRUNE);
    return items.length === 0 && value.length > 0 ? PRUNE : items;
  }
  // An entity picker whose entity type is unknown here (an unavailable extension's, or one this client cannot map)
  // and a numeric criterion holding a record ID (such as a host ID) both carry IDs with no portable form.
  if (
    (definition.type === "multiId" && (!definition.entityType || !ENTITY_TYPES.has(definition.entityType))) ||
    (definition.type === "number" && /ids?criterion$/i.test(definition.filterKey))
  ) {
    omit(walk, definition.label);
    return PRUNE;
  }
  if (!isRecord(value)) {
    // A bare number or array where an ID-bearing criterion object belongs could only carry raw IDs.
    if (!ID_BEARING_TYPES.has(definition.type)) return structuredClone(value);
    omit(walk, definition.label);
    return PRUNE;
  }
  if (definition.type === "multiId" && definition.entityType)
    return transformMultiId(walk, value, definition.entityType);
  if (definition.type === "tagDuration") return transformTagDuration(walk, value);
  // Source and model keys are the same on every server; only the client-only hints stay behind.
  if (definition.type === "aiAnalysis")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, child]) => [key, structuredClone(child)]),
    );
  if (definition.type === "related") return transformRelated(walk, value, definition);
  return structuredClone(value);
}

function transformCustomFieldCriterion(walk: Walk, value: unknown): unknown {
  if (!isRecord(value) || typeof value.type !== "string" || !(value.type in CUSTOM_FIELD_ENTITY_TYPES)) {
    return structuredClone(value);
  }
  const entityType = CUSTOM_FIELD_ENTITY_TYPES[value.type];
  const label = `Custom field “${String(value.key)}”`;
  if (!entityType) {
    omit(walk, label);
    return PRUNE;
  }
  const result = withoutNameHints(value);
  for (const [key, displayKey] of [
    ["value", "displayValue"],
    ["value2", "displayValue2"],
  ] as const) {
    if (value[key] == null || value[key] === "") continue;
    const mapped = mapItem(walk, entityType, value[key]);
    if (mapped === DROP) return PRUNE;
    result[key] = typeof mapped.value === "number" ? String(mapped.value) : mapped.value;
    if (mapped.label) result[displayKey] = mapped.label;
  }
  return result;
}

// Saved extension filters are packed as `{ extensionId, filterId, modifier, value }`; an entity-picker filter's value
// carries the picker's ID arrays, located through the definition the extension contributed for that key.
function transformExtensionCriterion(
  walk: Walk,
  value: unknown,
  byKey: ReadonlyMap<string, CriterionDefinition>,
): unknown {
  if (!isRecord(value) || typeof value.extensionId !== "string" || typeof value.filterId !== "string") {
    return structuredClone(value);
  }
  const definition = byKey.get(extensionFilterKey(value.extensionId, value.filterId));
  if (!definition) {
    // Without the extension's definition there is no telling whether the value names local entities.
    if (isRecord(value.value) || Array.isArray(value.value)) {
      omit(walk, `Extension filter “${value.filterId}”`);
      return PRUNE;
    }
    return structuredClone(value);
  }
  if (definition.type !== "multiId") return structuredClone(value);
  if (!isRecord(value.value)) {
    omit(walk, definition.label);
    return PRUNE;
  }
  const mapped = transformCriterion(walk, value.value, definition);
  return mapped === PRUNE ? PRUNE : { ...structuredClone(value), value: mapped };
}

function transformExpression(walk: Walk, value: unknown, definitions: CriterionDefinition[]): unknown {
  // A malformed group (pasted or hand-edited) cannot be evaluated or repaired; it is left out like any unknown shape.
  if (!isRecord(value) || !Array.isArray(value.children)) {
    omit(walk, "Malformed condition group");
    return PRUNE;
  }
  const children = value.children.flatMap((child): Record<string, unknown>[] => {
    if (!isRecord(child) || (!("filter" in child) && !("group" in child))) {
      omit(walk, "Malformed condition group");
      return [];
    }
    const removalsBefore = walk.removals;
    if ("filter" in child) {
      const filter = transformFilter(walk, child.filter, definitions);
      // An emptied branch would match everything in an OR group and nothing under NOT.
      return Object.keys(filter).length === 0 && walk.removals > removalsBefore ? [] : [{ ...child, filter }];
    }
    if ("group" in child) {
      const group = transformExpression(walk, child.group, definitions);
      return group === PRUNE ? [] : [{ ...child, group }];
    }
    return [];
  });
  if (children.length === 0 && value.children.length > 0) return PRUNE;
  return { ...structuredClone(value), children };
}

// A related scope needs at least two conditions on the related entity; removing one leaves a group the server rejects.
function transformRootExpression(walk: Walk, value: unknown, definitions: CriterionDefinition[]): unknown {
  const removalsBefore = walk.removals;
  const result = transformExpression(walk, value, definitions);
  if (result === PRUNE || walk.removals === removalsBefore || !isRecord(result)) return result;
  return repairRelatedScopes(result as unknown as FilterExpression<Record<string, unknown>>);
}

function transformFilter(walk: Walk, filter: unknown, definitions: CriterionDefinition[], mode?: string) {
  const result: Record<string, unknown> = {};
  if (!isRecord(filter)) return result;
  const byKey = new Map(definitions.map((definition) => [definition.filterKey, definition]));
  const companionKeys = new Set(
    definitions.flatMap((definition) =>
      [definition.secondaryFilterKey, definition.auxiliaryToggleKey].filter((key): key is string => !!key),
    ),
  );
  for (const [key, value] of Object.entries(filter)) {
    const definition = byKey.get(key);
    let mapped: unknown;
    if (key === "_names") continue;
    if (key === FILTER_EXPRESSION_STATE_KEY) mapped = transformRootExpression(walk, value, definitions);
    else if (key === CUSTOM_FIELD_CRITERIA_KEY && Array.isArray(value)) {
      const criteria = value.map((criterion) => transformCustomFieldCriterion(walk, criterion));
      mapped = criteria.filter((criterion) => criterion !== PRUNE);
    } else if (key === EXTENSION_CRITERIA_KEY && Array.isArray(value)) {
      mapped = value
        .map((criterion) => transformExtensionCriterion(walk, criterion, byKey))
        .filter((item) => item !== PRUNE);
    } else if (definition) mapped = transformCriterion(walk, value, definition);
    else if (companionKeys.has(key)) mapped = structuredClone(value);
    else if (key in LEGACY_ID_KEYS || (key === "ids" && mode && mode in LIST_ENTITY_TYPES)) {
      const entityType = key === "ids" ? LIST_ENTITY_TYPES[mode!] : LEGACY_ID_KEYS[key];
      const removalsBefore = walk.removals;
      const items = mapIdArray(walk, entityType, value) as unknown[];
      mapped = Array.isArray(value) ? items : items[0];
      if (items.length === 0 && walk.removals > removalsBefore) mapped = PRUNE;
    } else if (value === null || typeof value === "boolean" || typeof value === "string") mapped = value;
    else if (typeof value === "number" && !/ids?$/i.test(key)) mapped = value;
    else {
      // An unrecognized structure could hold local IDs anywhere inside it.
      omit(walk, `“${key}”`);
      continue;
    }
    if (mapped !== PRUNE && !(Array.isArray(mapped) && mapped.length === 0 && Array.isArray(value) && value.length > 0))
      result[key] = mapped;
  }
  return result;
}

function walkObjectFilter(
  objectFilter: Record<string, unknown> | undefined,
  criteria: CriterionDefinition[],
  mode: string,
  map: Mapper,
) {
  const walk: Walk = { map, omitted: [], removals: 0 };
  const result = transformFilter(walk, objectFilter ?? {}, criteria, mode);
  return { objectFilter: result, omitted: [...new Set(walk.omitted)] };
}

/** Every entity a list's object filter refers to, located through the list's own criterion definitions. */
export function collectEntityIdReferences(
  objectFilter: Record<string, unknown>,
  criteria: CriterionDefinition[],
  mode: string,
): EntityIdReference[] {
  const found = new Map<string, EntityIdReference>();
  walkObjectFilter(objectFilter, criteria, mode, (entityType, raw) => {
    const id = readId(raw);
    if (id != null) found.set(entityReferenceKey(entityType, id), { entityType, id });
    return { value: raw };
  });
  return [...found.values()];
}

/**
 * Replaces each entity ID with its portable reference. IDs with no reference (the entity no longer exists or cannot
 * be described portably) are left out, since a bare local ID would point at an unrelated entity elsewhere.
 */
export function toPortableObjectFilter(
  objectFilter: Record<string, unknown>,
  criteria: CriterionDefinition[],
  mode: string,
  references: ReadonlyMap<string, PortableEntityReference>,
) {
  return walkObjectFilter(objectFilter, criteria, mode, (entityType, raw) => {
    const id = readId(raw);
    const reference = id == null ? undefined : references.get(entityReferenceKey(entityType, id));
    return reference ? { value: structuredClone(reference) } : DROP;
  });
}

function parseJsonObject(json: string | undefined): Record<string, unknown> | undefined {
  if (!json) return undefined;
  try {
    const parsed: unknown = JSON.parse(json);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function parseSavedFilterObjectFilter(filter: SavedFilter) {
  return parseJsonObject(filter.objectFilter) ?? {};
}

// Display options travel; options naming local records (such as a segment display profile) do not.
const isPlainValue = (value: unknown) => value === null || ["string", "number", "boolean"].includes(typeof value);

// Display options (display mode, zoom, list columns and their widths) travel; an option named for a record ID does not.
function portableUiOptions(uiOptions: Record<string, unknown> | undefined) {
  const entries = Object.entries(uiOptions ?? {}).filter(
    ([key, value]) =>
      !/ids?$/i.test(key) &&
      (isPlainValue(value) ||
        (Array.isArray(value) && value.every(isPlainValue)) ||
        (isRecord(value) && Object.values(value).every(isPlainValue))),
  );
  return entries.length > 0 ? (Object.fromEntries(entries) as SavedFilterUIOptions) : undefined;
}

export function buildPortableSavedFilter(
  filter: SavedFilter,
  criteria: CriterionDefinition[],
  references: ReadonlyMap<string, PortableEntityReference>,
): { filter: PortableSavedFilter; omitted: string[] } {
  const findFilter = parseJsonObject(filter.findFilter) as FindFilter | undefined;
  // Paging and random seeds describe one viewing session, not the filter.
  const { page: _page, seed: _seed, ...portableFindFilter } = findFilter ?? {};
  const { objectFilter, omitted } = toPortableObjectFilter(
    parseSavedFilterObjectFilter(filter),
    criteria,
    filter.mode,
    references,
  );
  const uiOptions = portableUiOptions(parseJsonObject(filter.uiOptions));
  return {
    filter: {
      format: PORTABLE_SAVED_FILTER_FORMAT,
      version: PORTABLE_SAVED_FILTER_VERSION,
      mode: filter.mode,
      name: filter.name,
      ...(Object.keys(portableFindFilter).length > 0 ? { findFilter: portableFindFilter } : {}),
      ...(Object.keys(objectFilter).length > 0 ? { objectFilter } : {}),
      ...(uiOptions ? { uiOptions } : {}),
    },
    omitted,
  };
}

export function isPortableEntityReference(value: unknown): value is PortableEntityReference {
  return (
    isRecord(value) &&
    typeof value[REFERENCE_KEY] === "string" &&
    ENTITY_TYPES.has(value[REFERENCE_KEY]) &&
    typeof value.name === "string" &&
    value.name.trim() !== "" &&
    (value.disambiguation === undefined || typeof value.disambiguation === "string") &&
    (value.remoteIds === undefined ||
      (Array.isArray(value.remoteIds) &&
        value.remoteIds.every(
          (remoteId) =>
            isRecord(remoteId) && typeof remoteId.endpoint === "string" && typeof remoteId.remoteId === "string",
        )))
  );
}

/** Identifies a reference by everything matching uses, so repeats of one entity resolve once. */
export function portableReferenceKey(reference: PortableEntityReference) {
  const remoteIds = (reference.remoteIds ?? [])
    .map((remoteId) => `${remoteId.endpoint.trim().toLowerCase()}|${remoteId.remoteId.trim().toLowerCase()}`)
    .sort();
  return JSON.stringify([
    reference[REFERENCE_KEY],
    reference.name.trim().toLocaleLowerCase(),
    reference.disambiguation?.trim().toLocaleLowerCase() ?? "",
    remoteIds,
  ]);
}

/**
 * Walks an imported filter the way the import will, reporting the entity references it would look up and the
 * conditions this list cannot take. A reference in the wrong place, or a bare local ID, counts as neither.
 */
export function inspectPortableObjectFilter(
  objectFilter: Record<string, unknown> | undefined,
  criteria: CriterionDefinition[],
  mode: string,
) {
  const references = new Map<string, PortableEntityReference>();
  const { omitted } = walkObjectFilter(objectFilter, criteria, mode, (entityType, raw) => {
    if (isPortableEntityReference(raw) && raw[REFERENCE_KEY] === entityType) {
      references.set(portableReferenceKey(raw), raw);
      return { value: raw };
    }
    return DROP;
  });
  return { references: [...references.values()], omitted };
}

/**
 * Turns an imported object filter back into one with this library's IDs. Unresolved references are dropped, and a
 * condition, branch or group left naming nothing is removed rather than kept in a form that would match differently.
 */
export function resolvePortableObjectFilter(
  objectFilter: Record<string, unknown> | undefined,
  criteria: CriterionDefinition[],
  mode: string,
  resolve: (reference: PortableEntityReference) => ResolvedEntityReference | null,
) {
  return walkObjectFilter(objectFilter, criteria, mode, (entityType, raw) => {
    if (!isPortableEntityReference(raw) || raw[REFERENCE_KEY] !== entityType) return DROP;
    const resolved = resolve(raw);
    return resolved ? { value: resolved.id, label: resolved.name } : DROP;
  }).objectFilter;
}

export class PortableSavedFilterError extends Error {}

/** Parses pasted JSON, rejecting anything that is not a saved filter exported by Cove. */
export function parsePortableSavedFilter(text: string): PortableSavedFilter {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new PortableSavedFilterError("This is not valid JSON.");
  }
  if (!isRecord(parsed) || parsed.format !== PORTABLE_SAVED_FILTER_FORMAT) {
    throw new PortableSavedFilterError("This JSON is not an exported Cove saved filter.");
  }
  if (parsed.version !== PORTABLE_SAVED_FILTER_VERSION) {
    throw new PortableSavedFilterError(`Saved filter format version ${String(parsed.version)} is not supported.`);
  }
  if (typeof parsed.mode !== "string" || typeof parsed.name !== "string") {
    throw new PortableSavedFilterError("The exported saved filter is missing its list or name.");
  }
  for (const key of ["findFilter", "objectFilter", "uiOptions"] as const) {
    if (parsed[key] !== undefined && !isRecord(parsed[key])) {
      throw new PortableSavedFilterError(`The exported saved filter has an invalid ${key}.`);
    }
  }
  return {
    ...(parsed as unknown as PortableSavedFilter),
    uiOptions: portableUiOptions(parsed.uiOptions as Record<string, unknown> | undefined),
  };
}

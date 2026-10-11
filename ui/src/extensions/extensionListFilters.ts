import type { ExtensionFilterCriterion, ExtensionListFilterContribution } from "../api/types";
import type { CriterionDefinition, CriterionType, EntityType } from "../components/filterCriteriaTypes";

const KEY_PREFIX = "extension-filter:";

export function extensionFilterKey(extensionId: string, filterId: string) {
  return `${KEY_PREFIX}${encodeURIComponent(extensionId)}:${encodeURIComponent(filterId)}`;
}

function parseExtensionFilterKey(key: string) {
  if (!key.startsWith(KEY_PREFIX)) return null;
  const separator = key.indexOf(":", KEY_PREFIX.length);
  if (separator < 0) return null;
  try {
    return {
      extensionId: decodeURIComponent(key.slice(KEY_PREFIX.length, separator)),
      filterId: decodeURIComponent(key.slice(separator + 1)),
    };
  } catch {
    return null;
  }
}

/** Lists whose backend executes extension-owned filters (see TagsController and VideosController). */
const EXECUTABLE_FILTER_ENTITY_TYPES = new Set(["tags", "videos"]);

function normalizeFilterEntityType(entityType: string) {
  const normalized = entityType.trim().toLowerCase();
  return normalized.endsWith("s") ? normalized : `${normalized}s`;
}

export function executableExtensionFilterKey(contribution: ExtensionListFilterContribution) {
  if (
    !contribution.filterId ||
    !EXECUTABLE_FILTER_ENTITY_TYPES.has(normalizeFilterEntityType(contribution.entityType))
  ) {
    return null;
  }
  return extensionFilterKey(contribution.extensionId, contribution.filterId);
}

/** Editor spellings of modifiers whose wire form drops the underscore (for example `isnull`). */
const UI_MODIFIER_BY_COMPACT: Record<string, string> = {
  NOTEQUALS: "NOT_EQUALS",
  GREATERTHAN: "GREATER_THAN",
  LESSTHAN: "LESS_THAN",
  INCLUDESALL: "INCLUDES_ALL",
  EXCLUDESALL: "EXCLUDES_ALL",
  ISNULL: "IS_NULL",
  NOTNULL: "NOT_NULL",
  NOTBETWEEN: "NOT_BETWEEN",
  MATCHESREGEX: "MATCHES_REGEX",
  NOTMATCHESREGEX: "NOT_MATCHES_REGEX",
};

function toUiModifier(value: string) {
  const modifier = value
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replaceAll("-", "_")
    .toUpperCase();
  return UI_MODIFIER_BY_COMPACT[modifier] ?? modifier;
}

function toApiModifier(value: unknown) {
  return String(value ?? "equals")
    .toLowerCase()
    .replaceAll("_", "");
}

function isExtensionCriterion(value: unknown): value is ExtensionFilterCriterion {
  if (!value || typeof value !== "object") return false;
  const criterion = value as Record<string, unknown>;
  return (
    typeof criterion.extensionId === "string" &&
    criterion.extensionId.trim().length > 0 &&
    typeof criterion.filterId === "string" &&
    criterion.filterId.trim().length > 0 &&
    typeof criterion.modifier === "string" &&
    criterion.modifier.trim().length > 0 &&
    Object.hasOwn(criterion, "value")
  );
}

function malformedExtensionCriteria(filter: Record<string, unknown>) {
  return Array.isArray(filter.extensionCriteria)
    ? filter.extensionCriteria.filter((criterion) => !isExtensionCriterion(criterion))
    : [];
}

/** The multi-ID wire value: `{ value, excludes?, depth? }`, the only object an extension criterion carries. */
function isMultiIdWireValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMultiIdEditorCriterion(criterion: Record<string, unknown>) {
  return Array.isArray(criterion.value) || Array.isArray(criterion.excludes) || typeof criterion.depth === "number";
}

/** Packs the entity picker's state into one wire value, leaving out display-only `_names`. */
function toMultiIdWireValue(criterion: Record<string, unknown>) {
  const value: Record<string, unknown> = {};
  if (Array.isArray(criterion.value) && criterion.value.length > 0) value.value = criterion.value;
  if (Array.isArray(criterion.excludes) && criterion.excludes.length > 0) value.excludes = criterion.excludes;
  if (typeof criterion.depth === "number") value.depth = criterion.depth;
  return value;
}

export function expandExtensionCriteria(filter: Record<string, unknown>) {
  const expanded = { ...filter };
  const criteria = Array.isArray(filter.extensionCriteria) ? filter.extensionCriteria : [];
  delete expanded.extensionCriteria;
  for (const criterion of criteria) {
    if (!isExtensionCriterion(criterion)) continue;
    const modifier = toUiModifier(criterion.modifier);
    const wireValue: unknown = criterion.value;
    expanded[extensionFilterKey(criterion.extensionId, criterion.filterId)] = isMultiIdWireValue(wireValue)
      ? {
          modifier,
          value: Array.isArray(wireValue.value) ? wireValue.value : [],
          ...(Array.isArray(wireValue.excludes) ? { excludes: wireValue.excludes } : {}),
          ...(typeof wireValue.depth === "number" ? { depth: wireValue.depth } : {}),
        }
      : { modifier, value: wireValue };
  }
  const malformed = malformedExtensionCriteria(filter);
  if (malformed.length > 0) expanded.extensionCriteria = malformed;
  return expanded;
}

/**
 * Collapses editor keys back into `extensionCriteria`. Keys in `multiIdKeys` (entity-picker filters)
 * send their whole picker state as one value; a criterion shaped like picker state is packed the
 * same way so a saved one survives while its owner is unavailable.
 */
export function collapseExtensionCriteria(
  filter: Record<string, unknown>,
  preservedSource?: Record<string, unknown>,
  multiIdKeys?: ReadonlySet<string>,
) {
  const collapsed: Record<string, unknown> = {};
  const extensionCriteria: ExtensionFilterCriterion[] = [];
  for (const [key, value] of Object.entries(filter)) {
    const owned = parseExtensionFilterKey(key);
    if (!owned) {
      collapsed[key] = value;
      continue;
    }
    if (!value || typeof value !== "object") continue;
    const criterion = value as Record<string, unknown>;
    extensionCriteria.push({
      ...owned,
      modifier: toApiModifier(criterion.modifier),
      value:
        multiIdKeys?.has(key) || isMultiIdEditorCriterion(criterion) ? toMultiIdWireValue(criterion) : criterion.value,
    });
  }
  const preserved = malformedExtensionCriteria(preservedSource ?? filter);
  if (preserved.length > 0 || extensionCriteria.length > 0) {
    collapsed.extensionCriteria = [...preserved, ...extensionCriteria];
  }
  return collapsed;
}

function inferCriterionType(value: unknown): CriterionType {
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") return "number";
  if (isMultiIdWireValue(value)) return "multiId";
  return "string";
}

export function unavailableExtensionCriterionDefinitions(
  filter: Record<string, unknown>,
  contributions: ExtensionListFilterContribution[],
): CriterionDefinition[] {
  const declared = new Set(
    contributions.map(executableExtensionFilterKey).filter((key): key is string => key !== null),
  );
  const criteria = Array.isArray(filter.extensionCriteria) ? filter.extensionCriteria.filter(isExtensionCriterion) : [];
  return criteria
    .filter((criterion) => !declared.has(extensionFilterKey(criterion.extensionId, criterion.filterId)))
    .map((criterion) => ({
      id: extensionFilterKey(criterion.extensionId, criterion.filterId),
      filterKey: extensionFilterKey(criterion.extensionId, criterion.filterId),
      label: `Unavailable extension filter (${criterion.extensionId}/${criterion.filterId})`,
      type: inferCriterionType(criterion.value),
      supported: false,
      unsupportedReason: "Install or enable the owning extension to execute this saved filter.",
      expressionSupported: false,
    }));
}

const REFERENCE_ENTITY_TYPE_BY_EXTENSION_VALUE: Record<string, EntityType> = {
  tag: "tags",
  tags: "tags",
  taggroup: "tagGroups",
  taggroups: "tagGroups",
  tag_group: "tagGroups",
  performer: "performers",
  performers: "performers",
  studio: "studios",
  studios: "studios",
  group: "groups",
  groups: "groups",
  gallery: "galleries",
  galleries: "galleries",
  video: "videos",
  videos: "videos",
  face: "faces",
  faces: "faces",
};

function normalizeCriterionType(value: string | undefined): CriterionType {
  const normalized = (value ?? "string").trim().toLowerCase();
  switch (normalized) {
    case "bool":
    case "boolean":
      return "bool";
    case "int":
    case "integer":
    case "number":
      return "number";
    case "date":
      return "date";
    case "datetime":
    case "timestamp":
      return "timestamp";
    case "duration":
      return "duration";
    case "percent":
      return "number";
    case "rating":
      return "rating";
    case "multiid":
    case "reference":
      return "multiId";
    case "enum":
      return "enum";
    default:
      return "string";
  }
}

function normalizeReferenceEntityType(value?: string): EntityType | undefined {
  if (!value) return undefined;
  return REFERENCE_ENTITY_TYPE_BY_EXTENSION_VALUE[value.trim().toLowerCase()];
}

export function createExtensionCriterionDefinition(
  contribution: ExtensionListFilterContribution,
): CriterionDefinition | null {
  const criterionType = normalizeCriterionType(contribution.criterionType || contribution.customFieldType);
  const executableFilterKey = executableExtensionFilterKey(contribution);
  if (contribution.filterId && !executableFilterKey) return null;
  const filterKey =
    executableFilterKey ||
    contribution.filterKey ||
    (contribution.customFieldKey ? `extension:${contribution.extensionId}:${contribution.id}` : undefined);
  if (!filterKey) return null;

  return {
    id: `extension:${contribution.extensionId}:${contribution.id}`,
    label: contribution.label,
    type: criterionType,
    entityType: normalizeReferenceEntityType(contribution.entityReferenceType),
    filterKey,
    customFieldKey: contribution.customFieldKey,
    customFieldType: contribution.customFieldType,
    modifiers: contribution.modifiers,
    options: contribution.options,
    // Cove runs extension predicates over the candidates of the whole filter, so they cannot sit inside an OR or NOT group.
    ...(executableFilterKey ? { expressionSupported: false } : {}),
  };
}

import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import type {
  CriterionModifier,
  CustomFieldCriterion,
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldType,
} from "../api/types";
import { useCustomFieldDefinitions } from "../hooks/useCustomFieldDefinitions";
import type { FilterDialogCustomSection } from "./filterCriteriaTypes";
import {
  EntityReferenceSelector,
  getEntityReferenceLabel,
  isEntityReferenceType,
  parseEntityReferenceId,
} from "./EntityReferenceSelector";
import { IsoDateInput } from "./IsoDateInput";

export const CUSTOM_FIELD_FILTER_SECTION_ID = "custom-fields";
export const CUSTOM_FIELD_CRITERIA_FILTER_KEY = "customFieldCriteria";
const NO_DEFINITIONS: CustomFieldDefinition[] = [];

const CUSTOM_FIELD_ENTITY_BY_FILTER_MODE: Record<string, CustomFieldEntityType> = {
  videos: "video",
  audios: "audio",
  texts: "text",
  performers: "performer",
  tags: "tag",
  studios: "studio",
  galleries: "gallery",
  images: "image",
  groups: "group",
  faces: "face",
};

/**
 * The custom field entity behind a list `filterMode` (the saved-filter scope such as "videos"), so embedded lists
 * that already declare a mode get the same "Custom Fields" section as the top-level page. Modes over mixed entities
 * (for example group items) map to nothing.
 */
export function customFieldEntityTypeForFilterMode(filterMode: string | undefined): CustomFieldEntityType | undefined {
  return filterMode ? CUSTOM_FIELD_ENTITY_BY_FILTER_MODE[filterMode] : undefined;
}

export type CustomFieldQueryDefinition = CustomFieldDefinition & {
  jsonPath?: string;
  unavailable?: boolean;
  fieldLabel?: string;
  targetLabel?: string;
};

const CUSTOM_FIELD_MODIFIER_LABELS: Record<CriterionModifier, string> = {
  EQUALS: "Equals",
  NOT_EQUALS: "Does Not Equal",
  GREATER_THAN: ">",
  LESS_THAN: "<",
  INCLUDES: "Includes",
  EXCLUDES: "Excludes",
  INCLUDES_ALL: "Includes All",
  EXCLUDES_ALL: "Excludes All",
  IS_NULL: "Is Null",
  NOT_NULL: "Not Null",
  BETWEEN: "Between",
  NOT_BETWEEN: "Not Between",
  MATCHES_REGEX: "Regex",
  NOT_MATCHES_REGEX: "Not Regex",
  UNDER_PATH: "Under",
  NOT_UNDER_PATH: "Not Under",
};

const TEXT_CUSTOM_FIELD_MODIFIERS: CriterionModifier[] = [
  "EQUALS",
  "NOT_EQUALS",
  "INCLUDES",
  "EXCLUDES",
  "IS_NULL",
  "NOT_NULL",
];
const ORDERED_CUSTOM_FIELD_MODIFIERS: CriterionModifier[] = [
  "EQUALS",
  "NOT_EQUALS",
  "GREATER_THAN",
  "LESS_THAN",
  "BETWEEN",
  "NOT_BETWEEN",
  "IS_NULL",
  "NOT_NULL",
];
const BOOLEAN_CUSTOM_FIELD_MODIFIERS: CriterionModifier[] = ["EQUALS", "NOT_EQUALS", "IS_NULL", "NOT_NULL"];
const REFERENCE_CUSTOM_FIELD_MODIFIERS: CriterionModifier[] = ["INCLUDES", "EXCLUDES", "IS_NULL", "NOT_NULL"];
const PRESENCE_CUSTOM_FIELD_MODIFIERS: CriterionModifier[] = ["NOT_NULL", "IS_NULL"];

function getDefaultCustomFieldModifier(type: CustomFieldType): CriterionModifier {
  if (type === "json" || type === "longText") return "NOT_NULL";
  return isEntityReferenceType(type) ? "INCLUDES" : "EQUALS";
}

function getDefaultCustomFieldValue(type: CustomFieldType) {
  return type === "boolean" ? "true" : "";
}

export function normalizeCustomFieldCriteria(value: unknown): CustomFieldCriterion[] {
  return Array.isArray(value)
    ? value.filter((item): item is CustomFieldCriterion => Boolean(item && typeof item === "object"))
    : [];
}

function isCustomFieldCriterionActive(value: CustomFieldCriterion | undefined) {
  if (!value?.key) return false;
  const modifier = value.modifier ?? "EQUALS";
  if (modifier === "IS_NULL" || modifier === "NOT_NULL") return true;
  if (value.jsonPath && value.type === "text") {
    if (modifier === "EQUALS" || modifier === "NOT_EQUALS") return true;
    return String(value.value ?? "").length > 0;
  }
  if (modifier === "BETWEEN" || modifier === "NOT_BETWEEN") {
    return String(value.value ?? "").trim() !== "" && String(value.value2 ?? "").trim() !== "";
  }
  return String(value.value ?? "").trim() !== "";
}

function getCustomFieldModifiers(type: CustomFieldType) {
  switch (type) {
    case "json":
    case "longText":
      return PRESENCE_CUSTOM_FIELD_MODIFIERS;
    case "number":
    case "date":
    case "timestamp":
    case "duration":
    case "percent":
      return ORDERED_CUSTOM_FIELD_MODIFIERS;
    case "boolean":
      return BOOLEAN_CUSTOM_FIELD_MODIFIERS;
    case "tag":
    case "performer":
    case "studio":
    case "video":
    case "gallery":
    case "image":
    case "group":
      return REFERENCE_CUSTOM_FIELD_MODIFIERS;
    default:
      return TEXT_CUSTOM_FIELD_MODIFIERS;
  }
}

function formatCustomFieldCriterionValue(
  definition: CustomFieldQueryDefinition | undefined,
  criterion: CustomFieldCriterion,
  valueKey: "value" | "value2",
) {
  const rawValue = criterion[valueKey];
  if (definition?.jsonPath && definition.type === "text") {
    return JSON.stringify(String(rawValue ?? ""));
  }
  if (String(rawValue ?? "").trim() === "") {
    return "";
  }

  if (definition && isEntityReferenceType(definition.type)) {
    const displayValue = valueKey === "value2" ? criterion.displayValue2 : criterion.displayValue;
    return displayValue || `Selected ${getEntityReferenceLabel(definition.type).singular}`;
  }

  return String(rawValue);
}

function customFieldQueryDefinitionId(definition: CustomFieldQueryDefinition) {
  return definition.jsonPath ? `${definition.key}:${encodeURIComponent(definition.jsonPath)}` : definition.key;
}

export function findCustomFieldQueryDefinition(
  definitions: CustomFieldQueryDefinition[],
  criterion: CustomFieldCriterion,
) {
  return definitions.find(
    (candidate) =>
      candidate.key === criterion.key && (candidate.jsonPath ?? undefined) === (criterion.jsonPath ?? undefined),
  );
}

export function createCustomFieldQueryDefinitions(
  definitions: CustomFieldDefinition[],
  capability: "filterable" | "sortable",
): CustomFieldQueryDefinition[] {
  return definitions.flatMap((definition) => {
    if (definition.type === "longText") {
      return capability === "filterable"
        ? [
            {
              ...definition,
              fieldLabel: definition.label || definition.key,
              targetLabel: "Presence",
              filterable: true,
            },
          ]
        : [];
    }

    if (definition.type !== "json") {
      return definition[capability] ? [definition] : [];
    }

    const pathDefinitions = (definition.jsonPaths ?? [])
      .filter((jsonPath) => jsonPath[capability])
      .map((jsonPath) => ({
        ...definition,
        label: `${definition.label || definition.key} › ${jsonPath.label || jsonPath.path}`,
        fieldLabel: definition.label || definition.key,
        targetLabel: jsonPath.label || jsonPath.path,
        type: jsonPath.type,
        options: [],
        filterable: jsonPath.filterable,
        sortable: jsonPath.sortable,
        jsonPath: jsonPath.path,
      }));

    if (capability === "sortable") return pathDefinitions;
    return [
      {
        ...definition,
        fieldLabel: definition.label || definition.key,
        targetLabel: "Presence",
        filterable: true,
      },
      ...pathDefinitions,
    ];
  });
}

export function createUnavailableCustomFieldQueryDefinition(
  criterion: CustomFieldCriterion,
): CustomFieldQueryDefinition {
  const pathLabel = criterion.jsonPath ? ` › ${criterion.jsonPath}` : "";
  return {
    key: criterion.key,
    label: `${criterion.key}${pathLabel} (Unavailable)`,
    type: criterion.type ?? "text",
    entityTypes: [],
    options: [],
    filterable: false,
    sortable: false,
    isMultiValue: false,
    jsonPaths: [],
    jsonPath: criterion.jsonPath,
    unavailable: true,
    fieldLabel: criterion.key,
    targetLabel: criterion.jsonPath ? `${criterion.jsonPath} (Unavailable)` : "Unavailable",
  };
}

export function createCustomFieldFilterSection(definitions: CustomFieldQueryDefinition[]): FilterDialogCustomSection {
  const normalizeCriterion = (criterion: CustomFieldCriterion): CustomFieldCriterion => {
    const definition = findCustomFieldQueryDefinition(definitions, criterion);
    if (!definition) return criterion;
    const availableModifiers = getCustomFieldModifiers(definition.type);
    const defaultModifier = getDefaultCustomFieldModifier(definition.type);
    const modifier = availableModifiers.includes(criterion.modifier ?? defaultModifier)
      ? (criterion.modifier ?? defaultModifier)
      : defaultModifier;
    return { ...criterion, type: definition.type, jsonPath: definition.jsonPath, modifier };
  };

  return {
    id: CUSTOM_FIELD_FILTER_SECTION_ID,
    label: "Custom Fields",
    filterKey: CUSTOM_FIELD_CRITERIA_FILTER_KEY,
    defaultValue: [] satisfies CustomFieldCriterion[],
    isActive: (value) => normalizeCustomFieldCriteria(value).map(normalizeCriterion).some(isCustomFieldCriterionActive),
    shouldKeepDraft: (value) => normalizeCustomFieldCriteria(value).some((criterion) => Boolean(criterion.key)),
    sanitize: (value) =>
      normalizeCustomFieldCriteria(value).map(normalizeCriterion).filter(isCustomFieldCriterionActive),
    summarize: (value) => {
      const activeCriteria = normalizeCustomFieldCriteria(value)
        .map(normalizeCriterion)
        .filter(isCustomFieldCriterionActive);
      if (activeCriteria.length === 0) return "";
      return activeCriteria
        .map((criterion) => {
          const definition = findCustomFieldQueryDefinition(definitions, criterion);
          const label = definition?.label || criterion.key;
          const modifier = CUSTOM_FIELD_MODIFIER_LABELS[criterion.modifier ?? "EQUALS"];
          if (criterion.modifier === "IS_NULL" || criterion.modifier === "NOT_NULL") {
            return `${label} ${modifier}`;
          }

          if (criterion.modifier === "BETWEEN" || criterion.modifier === "NOT_BETWEEN") {
            return `${label} ${modifier} ${formatCustomFieldCriterionValue(definition, criterion, "value")} and ${formatCustomFieldCriterionValue(definition, criterion, "value2")}`;
          }

          return `${label} ${modifier} ${formatCustomFieldCriterionValue(definition, criterion, "value")}`;
        })
        .join(", ");
    },
    renderEditor: (value, onChange) => (
      <CustomFieldCriteriaEditor
        definitions={definitions}
        value={normalizeCustomFieldCriteria(value)}
        onChange={onChange}
      />
    ),
  };
}

function CustomFieldCriteriaEditor({
  definitions,
  value,
  onChange,
}: {
  definitions: CustomFieldQueryDefinition[];
  value: CustomFieldCriterion[];
  onChange: (value: CustomFieldCriterion[]) => void;
}) {
  const firstDefinition = definitions.find((definition) => !definition.unavailable);
  const fieldDefinitions = definitions.filter(
    (definition, index) => definitions.findIndex((candidate) => candidate.key === definition.key) === index,
  );
  const rows = value.length > 0 ? value : [];
  const setRow = (index: number, nextCriterion: CustomFieldCriterion) => {
    onChange(rows.map((criterion, candidateIndex) => (candidateIndex === index ? nextCriterion : criterion)));
  };
  const removeRow = (index: number) => onChange(rows.filter((_, candidateIndex) => candidateIndex !== index));
  const addRow = () => {
    if (!firstDefinition) return;
    onChange([
      ...rows,
      {
        key: firstDefinition.key,
        jsonPath: firstDefinition.jsonPath,
        type: firstDefinition.type,
        value: getDefaultCustomFieldValue(firstDefinition.type),
        modifier: getDefaultCustomFieldModifier(firstDefinition.type),
      },
    ]);
  };

  return (
    <div className="space-y-2">
      {rows.map((criterion, index) => {
        const definition = findCustomFieldQueryDefinition(definitions, criterion) ?? firstDefinition;
        if (!definition) return null;
        const availableModifiers = getCustomFieldModifiers(definition.type);
        const defaultModifier = getDefaultCustomFieldModifier(definition.type);
        const modifier = availableModifiers.includes(criterion.modifier ?? defaultModifier)
          ? (criterion.modifier ?? defaultModifier)
          : defaultModifier;
        const valueDisabled = modifier === "IS_NULL" || modifier === "NOT_NULL";
        const targetDefinitions = definitions.filter((candidate) => candidate.key === definition.key);

        return (
          <div key={`${criterion.key}-${index}`} className="min-w-0 rounded border border-border bg-background p-3">
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(10rem,1fr)_minmax(9rem,0.75fr)] xl:grid-cols-[minmax(12rem,1.1fr)_minmax(9rem,0.6fr)_minmax(18rem,2fr)_auto] xl:items-start">
              <div className="min-w-0 space-y-2">
                <label className="block min-w-0 text-xs text-muted">
                  Field
                  <select
                    value={definition.key}
                    onChange={(event) => {
                      const nextDefinition =
                        definitions.find(
                          (candidate) => candidate.key === event.target.value && !candidate.unavailable,
                        ) ?? definition;
                      setRow(index, {
                        key: nextDefinition.key,
                        jsonPath: nextDefinition.jsonPath,
                        type: nextDefinition.type,
                        value: getDefaultCustomFieldValue(nextDefinition.type),
                        modifier: getDefaultCustomFieldModifier(nextDefinition.type),
                      });
                    }}
                    className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    {fieldDefinitions.map((option) => (
                      <option key={option.key} value={option.key} disabled={option.unavailable}>
                        {option.fieldLabel || option.label || option.key}
                      </option>
                    ))}
                  </select>
                </label>
                {targetDefinitions.length > 1 || definition.jsonPath ? (
                  <label className="block min-w-0 text-xs text-muted">
                    Target
                    <select
                      value={customFieldQueryDefinitionId(definition)}
                      onChange={(event) => {
                        const nextDefinition =
                          targetDefinitions.find(
                            (candidate) => customFieldQueryDefinitionId(candidate) === event.target.value,
                          ) ?? definition;
                        setRow(index, {
                          key: nextDefinition.key,
                          jsonPath: nextDefinition.jsonPath,
                          type: nextDefinition.type,
                          value: getDefaultCustomFieldValue(nextDefinition.type),
                          modifier: getDefaultCustomFieldModifier(nextDefinition.type),
                        });
                      }}
                      className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    >
                      {targetDefinitions.map((option) => (
                        <option
                          key={customFieldQueryDefinitionId(option)}
                          value={customFieldQueryDefinitionId(option)}
                          disabled={option.unavailable}
                        >
                          {option.targetLabel || option.label || option.key}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              <label className="block min-w-0 text-xs text-muted">
                Match
                <select
                  value={modifier}
                  onChange={(event) =>
                    setRow(index, { ...criterion, modifier: event.target.value as CriterionModifier })
                  }
                  className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {availableModifiers.map((option) => (
                    <option key={option} value={option}>
                      {CUSTOM_FIELD_MODIFIER_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className={`min-w-0 ${modifier === "BETWEEN" || modifier === "NOT_BETWEEN" ? "grid gap-2 sm:grid-cols-2" : ""}`}
              >
                <CustomFieldValueInput
                  definition={definition}
                  disabled={valueDisabled}
                  value={criterion.value ?? ""}
                  onChange={(nextValue, displayValue) =>
                    setRow(index, {
                      ...criterion,
                      modifier,
                      type: definition.type,
                      jsonPath: definition.jsonPath,
                      value: nextValue,
                      displayValue,
                    })
                  }
                />
                {modifier === "BETWEEN" || modifier === "NOT_BETWEEN" ? (
                  <CustomFieldValueInput
                    definition={definition}
                    disabled={valueDisabled}
                    label="And"
                    value={criterion.value2 ?? ""}
                    onChange={(nextValue, displayValue) =>
                      setRow(index, {
                        ...criterion,
                        modifier,
                        type: definition.type,
                        jsonPath: definition.jsonPath,
                        value2: nextValue,
                        displayValue2: displayValue,
                      })
                    }
                  />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label="Remove custom field filter"
                className="justify-self-start rounded border border-border p-2 text-muted hover:border-red-400 hover:text-red-300 xl:mt-6"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addRow}
        disabled={!firstDefinition}
        className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-secondary hover:border-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add custom field filter
      </button>
    </div>
  );
}

function CustomFieldValueInput({
  definition,
  disabled,
  label = "Value",
  value,
  onChange,
}: {
  definition: CustomFieldDefinition;
  disabled: boolean;
  label?: string;
  value: string;
  onChange: (value: string, displayValue?: string) => void;
}) {
  if (isEntityReferenceType(definition.type)) {
    const selectedId = parseEntityReferenceId(value);
    const labels = getEntityReferenceLabel(definition.type);
    return (
      <label className="block min-w-0 text-xs text-muted">
        {label}
        <div className="mt-1 min-w-0">
          <EntityReferenceSelector
            entityType={definition.type}
            value={selectedId}
            disabled={disabled}
            placeholder={`Search ${labels.plural}...`}
            inputClassName="w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted disabled:opacity-50 focus:border-accent focus:outline-none"
            onChange={(nextId, option) => onChange(nextId == null ? "" : String(nextId), option?.label)}
          />
        </div>
      </label>
    );
  }

  if (definition.type === "boolean") {
    return (
      <label className="block text-xs text-muted">
        {label}
        <select
          disabled={disabled}
          value={value || "true"}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground disabled:opacity-50 focus:border-accent focus:outline-none"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </label>
    );
  }

  if (definition.type === "enum" && definition.options.length > 0) {
    return (
      <label className="block text-xs text-muted">
        {label}
        <select
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground disabled:opacity-50 focus:border-accent focus:outline-none"
        >
          <option value="">Select</option>
          {definition.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const inputType: Partial<Record<CustomFieldType, string>> = {
    text: "text",
    longText: "text",
    number: "number",
    boolean: "text",
    date: "text",
    timestamp: "text",
    url: "url",
    enum: "text",
    duration: "number",
    percent: "number",
  };

  const Input = definition.type === "date" || definition.type === "timestamp" ? IsoDateInput : "input";
  return (
    <label className="block text-xs text-muted">
      {label}
      <Input
        {...(definition.type === "timestamp" ? { pickerType: "datetime-local" as const } : {})}
        type={inputType[definition.type] ?? "text"}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground disabled:opacity-50 focus:border-accent focus:outline-none"
      />
    </label>
  );
}

/**
 * Builds the "Custom Fields" filter-dialog section for an entity type from its filterable custom field
 * definitions. Criteria already present in `objectFilter` whose field no longer exists stay editable as
 * unavailable rows so they can be removed. Returns undefined while nothing is filterable and no criteria exist.
 */
export function useCustomFieldFilterSection(
  entityType: CustomFieldEntityType | undefined,
  objectFilter: Record<string, unknown> | undefined,
): FilterDialogCustomSection | undefined {
  // A disabled observer can still read cached data written under the same key by other pages, so only trust
  // definitions when an entity type was actually requested.
  const { data } = useCustomFieldDefinitions(entityType, Boolean(entityType));
  const customFieldDefinitions = entityType ? (data ?? NO_DEFINITIONS) : NO_DEFINITIONS;
  const activeCriteria = objectFilter?.[CUSTOM_FIELD_CRITERIA_FILTER_KEY];
  return useMemo(() => {
    const definitions = createCustomFieldQueryDefinitions(customFieldDefinitions, "filterable");
    const unavailableDefinitions = normalizeCustomFieldCriteria(activeCriteria)
      .filter((criterion) => Boolean(criterion.key) && !findCustomFieldQueryDefinition(definitions, criterion))
      .filter(
        (criterion, index, criteria) =>
          criteria.findIndex(
            (candidate) =>
              candidate.key === criterion.key &&
              (candidate.jsonPath ?? undefined) === (criterion.jsonPath ?? undefined),
          ) === index,
      )
      .map(createUnavailableCustomFieldQueryDefinition);
    const editorDefinitions = [...definitions, ...unavailableDefinitions];

    return editorDefinitions.length > 0 ? createCustomFieldFilterSection(editorDefinitions) : undefined;
  }, [activeCriteria, customFieldDefinitions]);
}

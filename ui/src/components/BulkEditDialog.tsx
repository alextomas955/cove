import { useCallback, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { InteractiveRating } from "./Rating";
import { IsoDateInput } from "./IsoDateInput";
import type { BulkUpdateMode, CustomFieldDefinition, CustomFieldEntityType } from "../api/types";
import { tagGroups } from "../api/client";
import { StudioSelector } from "./StudioSelector";
import { EntityReferenceMultiSelector, type EntityReferenceType } from "./EntityReferenceSelector";
import { CountrySelect } from "./Country";
import { ConfiguredFieldInput, normalizeConfiguredFieldValue } from "./CustomFields";
import { useCustomFieldDefinitions } from "../hooks/useCustomFieldDefinitions";

// ===== Generic Bulk Edit Dialog =====

export interface BulkEditField {
  key: string;
  label: string;
  type: "rating" | "number" | "bool" | "string" | "date" | "select" | "multiId" | "country";
  entityType?: "tags" | "performers" | "studios" | "groups" | "galleries" | "tagGroups";
  options?: { label: string; value: string | number }[];
  modeKey?: string;
  nullable?: boolean;
  serializeValue?: (value: unknown) => unknown;
}

interface BulkEditDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  selectedCount: number;
  fields: BulkEditField[];
  onApply: (values: Record<string, unknown>) => void;
  isPending?: boolean;
  /**
   * When set, the dialog loads this entity's custom field definitions and offers a Custom fields section.
   * Only pass it for entities whose bulk endpoint accepts `customFields`, `customFieldMode`, and
   * `clearFields: ["customFields.<key>"]`.
   */
  customFieldEntityType?: CustomFieldEntityType;
}

/** Prefix shared by the request's `clearFields` entries and this dialog's internal state keys. */
const CUSTOM_FIELD_KEY_PREFIX = "customFields.";

function toCustomFieldStateKey(definitionKey: string) {
  return `${CUSTOM_FIELD_KEY_PREFIX}${definitionKey}`;
}

export function BulkEditDialog({
  open,
  onClose,
  title,
  selectedCount,
  fields,
  onApply,
  isPending,
  customFieldEntityType,
}: BulkEditDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [clearedCustomFields, setClearedCustomFields] = useState<Set<string>>(new Set());
  const [customFieldMode, setCustomFieldMode] = useState<BulkUpdateMode>("ADD");
  const [invalidJsonKeys, setInvalidJsonKeys] = useState<Set<string>>(new Set());
  const customFieldDefinitionsQuery = useCustomFieldDefinitions(customFieldEntityType, Boolean(customFieldEntityType));
  const customFieldDefinitions = customFieldEntityType ? (customFieldDefinitionsQuery.data ?? []) : [];

  const dropCustomFieldDraft = (definition: CustomFieldDefinition) => {
    setValues((current) => {
      const next = { ...current };
      delete next[toCustomFieldStateKey(definition.key)];
      return next;
    });
    setInvalidJsonKeys((current) => withoutKey(current, definition.key));
  };

  const toggleCustomField = (definition: CustomFieldDefinition) => {
    const stateKey = toCustomFieldStateKey(definition.key);
    if (enabledFields.has(stateKey)) {
      setEnabledFields((current) => withoutKey(current, stateKey));
      setClearedCustomFields((current) => withoutKey(current, definition.key));
      dropCustomFieldDraft(definition);
    } else {
      setEnabledFields((current) => new Set(current).add(stateKey));
    }
  };

  const toggleCustomFieldCleared = (definition: CustomFieldDefinition) => {
    if (clearedCustomFields.has(definition.key)) {
      setClearedCustomFields((current) => withoutKey(current, definition.key));
    } else {
      setClearedCustomFields((current) => new Set(current).add(definition.key));
      dropCustomFieldDraft(definition);
    }
  };

  const updateJsonValidity = useCallback((key: string, isValid: boolean) => {
    setInvalidJsonKeys((current) => {
      if (isValid) return withoutKey(current, key);
      return current.has(key) ? current : new Set(current).add(key);
    });
  }, []);

  const hasInvalidCustomFieldJson = customFieldDefinitions.some(
    (definition) => enabledFields.has(toCustomFieldStateKey(definition.key)) && invalidJsonKeys.has(definition.key),
  );

  const toggleField = (field: BulkEditField) => {
    setEnabledFields((prev) => {
      const next = new Set(prev);
      if (next.has(field.key)) {
        next.delete(field.key);
        setValues((currentValues) => {
          const nextValues = { ...currentValues };
          delete nextValues[field.key];
          delete nextValues[getModeKey(field)];
          return nextValues;
        });
      } else {
        next.add(field.key);
      }
      return next;
    });
  };

  const updateValue = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const buildPayload = () => {
    const result: Record<string, unknown> = {};
    const clearFields: string[] = [];
    for (const f of fields) {
      if (enabledFields.has(f.key)) {
        const serializedValue = serializeBulkFieldValue(f, values[f.key]);
        if (f.nullable && (serializedValue == null || serializedValue === "")) {
          result[f.key] = null;
          clearFields.push(f.key);
        } else {
          result[f.key] = serializedValue;
        }
        if (f.type === "multiId") {
          result[getModeKey(f)] = values[getModeKey(f)] ?? "ADD";
        }
      }
    }
    const customFields: Record<string, unknown> = {};
    for (const definition of customFieldDefinitions) {
      const stateKey = toCustomFieldStateKey(definition.key);
      if (!enabledFields.has(stateKey)) continue;
      if (clearedCustomFields.has(definition.key)) {
        clearFields.push(stateKey);
        continue;
      }
      const normalizedValue = normalizeConfiguredFieldValue(values[stateKey], definition);
      if (normalizedValue === undefined) continue;
      customFields[definition.key] = normalizedValue;
    }
    if (Object.keys(customFields).length > 0) {
      result.customFields = customFields;
      result.customFieldMode = customFieldMode;
    }
    if (clearFields.length > 0) {
      result.clearFields = clearFields;
    }
    return result;
  };

  if (!open) return null;

  const payload = buildPayload();
  // A ticked field with nothing entered contributes nothing; do not send a request that changes nothing.
  const hasChanges = Object.values(payload).some((value) => value !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {title} <span className="text-muted font-normal">({selectedCount} selected)</span>
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-card rounded text-muted hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {fields.map((field) => (
            <BulkFieldEditor
              key={field.key}
              field={field}
              enabled={enabledFields.has(field.key)}
              onToggle={() => toggleField(field)}
              value={values[field.key]}
              mode={(values[getModeKey(field)] as BulkUpdateMode) ?? "ADD"}
              onValueChange={(v) => updateValue(field.key, v)}
              onModeChange={(m) => updateValue(getModeKey(field), m)}
            />
          ))}
          {customFieldDefinitions.length > 0 && (
            <CustomFieldsBulkSection
              definitions={customFieldDefinitions}
              mode={customFieldMode}
              onModeChange={setCustomFieldMode}
              enabledFields={enabledFields}
              clearedFields={clearedCustomFields}
              values={values}
              onToggle={toggleCustomField}
              onToggleCleared={toggleCustomFieldCleared}
              onValueChange={(definition, nextValue) => updateValue(toCustomFieldStateKey(definition.key), nextValue)}
              onJsonValidityChange={updateJsonValidity}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-xs text-secondary hover:text-foreground border border-border"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(payload)}
            disabled={isPending || !hasChanges || hasInvalidCustomFieldJson}
            className="px-4 py-1 rounded text-xs font-medium bg-accent hover:bg-accent-hover text-white disabled:opacity-50"
          >
            {isPending ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkFieldEditor({
  field,
  enabled,
  onToggle,
  value,
  mode,
  onValueChange,
  onModeChange,
}: {
  field: BulkEditField;
  enabled: boolean;
  onToggle: () => void;
  value: unknown;
  mode: BulkUpdateMode;
  onValueChange: (v: unknown) => void;
  onModeChange: (m: BulkUpdateMode) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="w-3.5 h-3.5 rounded border-border accent-accent"
        />
        <span className={`text-xs font-medium ${enabled ? "text-foreground" : "text-muted"}`}>{field.label}</span>
      </label>
      {enabled && (
        <div className="ml-6 mt-1">
          {field.type === "rating" && (
            <div className="rounded border border-border bg-input px-3 py-2">
              <InteractiveRating
                value={value as number | undefined}
                onChange={(nextValue) => onValueChange(nextValue || undefined)}
              />
            </div>
          )}
          {field.type === "number" && (
            <input
              type="number"
              value={(value as number) ?? ""}
              onChange={(e) => onValueChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-24 bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
            />
          )}
          {field.type === "bool" && (
            <div className="flex gap-2">
              <button
                onClick={() => onValueChange(true)}
                className={`px-3 py-1 rounded text-xs border ${value === true ? "bg-accent text-white border-accent" : "border-border text-secondary"}`}
              >
                True
              </button>
              <button
                onClick={() => onValueChange(false)}
                className={`px-3 py-1 rounded text-xs border ${value === false ? "bg-accent text-white border-accent" : "border-border text-secondary"}`}
              >
                False
              </button>
            </div>
          )}
          {field.type === "string" && (
            <input
              type="text"
              value={(value as string) ?? ""}
              onChange={(e) => onValueChange(e.target.value)}
              className="w-full bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
            />
          )}
          {field.type === "date" && (
            <IsoDateInput
              value={(value as string) ?? ""}
              onChange={(e) => onValueChange(e.target.value)}
              className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
            />
          )}
          {field.type === "country" && <CountrySelect value={(value as string) ?? ""} onChange={onValueChange} />}
          {field.type === "select" && field.entityType === "studios" && (
            <div className="space-y-2">
              <StudioSelector value={value as number | undefined} onChange={(nextValue) => onValueChange(nextValue)} />
              {field.nullable && (
                <button
                  type="button"
                  onClick={() => onValueChange(undefined)}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${value == null ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:text-foreground"}`}
                >
                  <X className="h-3 w-3" />
                  Clear value
                </button>
              )}
            </div>
          )}
          {field.type === "select" && field.entityType === "tagGroups" && (
            <TagGroupBulkSelect
              value={value as number | undefined}
              nullable={field.nullable}
              onValueChange={onValueChange}
            />
          )}
          {field.type === "select" && field.entityType !== "studios" && field.entityType !== "tagGroups" && (
            <select
              value={String(value ?? "")}
              onChange={(e) => {
                if (!e.target.value) {
                  onValueChange(undefined);
                  return;
                }

                const selectedOption = field.options?.find((option) => String(option.value) === e.target.value);
                onValueChange(selectedOption?.value ?? e.target.value);
              }}
              className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">Select...</option>
              {field.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {field.type === "multiId" && isMultiIdEntityType(field.entityType) && (
            <MultiIdBulkEditor
              entityType={field.entityType}
              value={(value as number[]) ?? []}
              mode={mode}
              onValueChange={onValueChange}
              onModeChange={onModeChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CustomFieldsBulkSection({
  definitions,
  mode,
  onModeChange,
  enabledFields,
  clearedFields,
  values,
  onToggle,
  onToggleCleared,
  onValueChange,
  onJsonValidityChange,
}: {
  definitions: CustomFieldDefinition[];
  mode: BulkUpdateMode;
  onModeChange: (mode: BulkUpdateMode) => void;
  enabledFields: Set<string>;
  clearedFields: Set<string>;
  values: Record<string, unknown>;
  onToggle: (definition: CustomFieldDefinition) => void;
  onToggleCleared: (definition: CustomFieldDefinition) => void;
  onValueChange: (definition: CustomFieldDefinition, value: unknown) => void;
  onJsonValidityChange: (key: string, isValid: boolean) => void;
}) {
  const modeRadioName = useId();
  const bodyId = useId();
  const [expanded, setExpanded] = useState(false);
  const tickedCount = definitions.filter((definition) =>
    enabledFields.has(toCustomFieldStateKey(definition.key)),
  ).length;
  // Collapsed by default so a long definition list does not bury the standard fields. Ticking a field opens it,
  // and the header keeps showing how many are ticked while it is collapsed.
  const open = expanded;
  const valuedDefinitions = definitions.filter(
    (definition) => enabledFields.has(toCustomFieldStateKey(definition.key)) && !clearedFields.has(definition.key),
  );
  // The mode only travels with values, so it is offered only while some ticked field is not being cleared.
  const showMode = valuedDefinitions.length > 0;
  const anyMultiValue = valuedDefinitions.some((definition) => definition.isMultiValue);

  return (
    <div role="group" aria-label="Custom fields" className="border-t border-border pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setExpanded((current) => !current)}
          className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Custom fields
          <span className="font-normal text-muted">
            ({tickedCount > 0 ? `${tickedCount} of ${definitions.length} selected` : definitions.length})
          </span>
        </button>
        {open && showMode && (
          <fieldset className="flex gap-1">
            <legend className="sr-only">Custom field mode</legend>
            {(["SET", "ADD", "REMOVE"] as BulkUpdateMode[]).map((candidate) => (
              <label
                key={candidate}
                className={`cursor-pointer px-2 py-0.5 rounded text-[10px] border has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-surface ${
                  candidate === mode ? "bg-accent text-white border-accent" : "border-border text-secondary"
                }`}
              >
                <input
                  type="radio"
                  name={modeRadioName}
                  value={candidate}
                  checked={candidate === mode}
                  onChange={() => onModeChange(candidate)}
                  className="sr-only"
                />
                {BULK_MODE_LABELS[candidate]}
              </label>
            ))}
          </fieldset>
        )}
      </div>
      {open && (
        <div id={bodyId} className="space-y-3">
          {showMode && (
            <p className="text-[11px] text-muted">
              {mode === "SET"
                ? "Overwrite replaces the current value on every selected item."
                : mode === "ADD"
                  ? anyMultiValue
                    ? "Add appends new entries to multi-value fields and overwrites single-value fields."
                    : "Add overwrites single-value fields with the entered value."
                  : anyMultiValue
                    ? "Remove drops matching entries from multi-value fields and clears single-value fields whose value matches."
                    : "Remove clears single-value fields whose current value matches the entered value."}
            </p>
          )}
          {definitions.map((definition) => {
            const stateKey = toCustomFieldStateKey(definition.key);
            const enabled = enabledFields.has(stateKey);
            const cleared = clearedFields.has(definition.key);
            const label = definition.label || definition.key;
            // The accessible name starts with the visible text so voice control can target the button by what it shows.
            const clearText = cleared ? "Clearing value on every selected item" : "Clear value";
            return (
              <div key={definition.key}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => {
                      if (!enabled) setExpanded(true);
                      onToggle(definition);
                    }}
                    className="w-3.5 h-3.5 rounded border-border accent-accent"
                  />
                  <span className={`text-xs font-medium ${enabled ? "text-foreground" : "text-muted"}`}>{label}</span>
                  <span className="text-[11px] text-muted">{definition.key}</span>
                </label>
                {enabled && (
                  <div className="ml-6 mt-1 space-y-2">
                    {!cleared && (
                      <ConfiguredFieldInput
                        definition={definition}
                        value={values[stateKey]}
                        onChange={(nextValue) => onValueChange(definition, nextValue)}
                        onJsonValidityChange={onJsonValidityChange}
                        ariaLabel={label}
                      />
                    )}
                    <button
                      type="button"
                      aria-pressed={cleared}
                      aria-label={`${clearText} for ${label}`}
                      onClick={() => onToggleCleared(definition)}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${cleared ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:text-foreground"}`}
                    >
                      <X className="h-3 w-3" />
                      {clearText}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TagGroupBulkSelect({
  value,
  nullable,
  onValueChange,
}: {
  value?: number;
  nullable?: boolean;
  onValueChange: (v: unknown) => void;
}) {
  const { data: groups = [], isLoading } = useQuery({ queryKey: ["tag-groups"], queryFn: tagGroups.list });

  return (
    <div className="space-y-2">
      <select
        value={String(value ?? "")}
        onChange={(event) => onValueChange(event.target.value ? Number(event.target.value) : undefined)}
        className="w-full bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
      >
        <option value="">{isLoading ? "Loading tag groups..." : "Select tag group..."}</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
      {nullable && (
        <button
          type="button"
          onClick={() => onValueChange(undefined)}
          className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${value == null ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:text-foreground"}`}
        >
          <X className="h-3 w-3" />
          Clear value
        </button>
      )}
    </div>
  );
}

function MultiIdBulkEditor({
  entityType,
  value,
  mode,
  onValueChange,
  onModeChange,
}: {
  entityType: "tags" | "performers" | "studios" | "groups" | "galleries";
  value: number[];
  mode: BulkUpdateMode;
  onValueChange: (v: unknown) => void;
  onModeChange: (m: BulkUpdateMode) => void;
}) {
  return (
    <div className="space-y-2">
      {/* Mode selector */}
      <div className="flex gap-1">
        {(["SET", "ADD", "REMOVE"] as BulkUpdateMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-2 py-0.5 rounded text-[10px] border ${
              m === mode ? "bg-accent text-white border-accent" : "border-border text-secondary"
            }`}
          >
            {BULK_MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <EntityReferenceMultiSelector
        entityType={toReferenceEntityType(entityType)}
        values={value}
        onChange={onValueChange as (values: number[]) => void}
        placeholder={`Search ${entityType}...`}
        inputClassName="w-full bg-input border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent placeholder:text-muted"
        resultsMaxHeight={128}
      />
    </div>
  );
}

function toReferenceEntityType(
  entityType: "tags" | "performers" | "studios" | "groups" | "galleries",
): EntityReferenceType {
  switch (entityType) {
    case "tags":
      return "tag";
    case "performers":
      return "performer";
    case "studios":
      return "studio";
    case "groups":
      return "group";
    case "galleries":
      return "gallery";
  }
}

function isMultiIdEntityType(
  entityType: BulkEditField["entityType"],
): entityType is "tags" | "performers" | "studios" | "groups" | "galleries" {
  return (
    entityType === "tags" ||
    entityType === "performers" ||
    entityType === "studios" ||
    entityType === "groups" ||
    entityType === "galleries"
  );
}

const BULK_MODE_LABELS: Record<BulkUpdateMode, string> = {
  SET: "Overwrite",
  ADD: "Add",
  REMOVE: "Remove",
};

function withoutKey(set: Set<string>, key: string) {
  if (!set.has(key)) return set;
  const next = new Set(set);
  next.delete(key);
  return next;
}

function getModeKey(field: BulkEditField) {
  return field.modeKey ?? `${field.key}Mode`;
}

function serializeBulkFieldValue(field: BulkEditField, value: unknown) {
  if (field.serializeValue) {
    return field.serializeValue(value);
  }

  if (field.type === "multiId") {
    return value ?? [];
  }

  if (field.type === "string" || field.type === "date") {
    return value ?? "";
  }

  return value;
}

// ===== Pre-configured bulk edit field sets =====

export const VIDEO_BULK_FIELDS: BulkEditField[] = [
  { key: "rating", label: "Rating", type: "rating" },
  { key: "organized", label: "Organized", type: "bool" },
  { key: "isVr", label: "VR", type: "bool" },
  { key: "studioId", label: "Studio", type: "select", entityType: "studios", nullable: true },
  { key: "date", label: "Date", type: "date" },
  { key: "code", label: "Studio Code", type: "string" },
  { key: "director", label: "Director", type: "string" },
  { key: "tagIds", label: "Tags", type: "multiId", entityType: "tags", modeKey: "tagMode" },
  { key: "performerIds", label: "Performers", type: "multiId", entityType: "performers", modeKey: "performerMode" },
  {
    key: "groupIds",
    label: "Groups",
    type: "multiId",
    entityType: "groups",
    modeKey: "groupMode",
    serializeValue: (value) => ((value as number[] | undefined) ?? []).map((groupId) => ({ groupId, videoIndex: 0 })),
  },
];

export const PERFORMER_BULK_FIELDS: BulkEditField[] = [
  { key: "rating", label: "Rating", type: "rating" },
  { key: "favorite", label: "Favorite", type: "bool" },
  {
    key: "gender",
    label: "Gender",
    type: "select",
    options: ["Female", "Male", "TransgenderFemale", "TransgenderMale", "Intersex", "NonBinary"].map((value) => ({
      value,
      label: value.replace(/([a-z])([A-Z])/g, "$1 $2"),
    })),
  },
  { key: "country", label: "Country", type: "country", nullable: true },
  { key: "details", label: "Details", type: "string" },
  { key: "tagIds", label: "Tags", type: "multiId", entityType: "tags", modeKey: "tagMode" },
];

export const GALLERY_BULK_FIELDS: BulkEditField[] = [
  { key: "rating", label: "Rating", type: "rating" },
  { key: "organized", label: "Organized", type: "bool" },
  { key: "studioId", label: "Studio", type: "select", entityType: "studios", nullable: true },
  { key: "date", label: "Date", type: "date" },
  { key: "code", label: "Studio Code", type: "string" },
  { key: "photographer", label: "Photographer", type: "string" },
  { key: "details", label: "Details", type: "string" },
  { key: "tagIds", label: "Tags", type: "multiId", entityType: "tags", modeKey: "tagMode" },
  { key: "performerIds", label: "Performers", type: "multiId", entityType: "performers", modeKey: "performerMode" },
];

export const IMAGE_BULK_FIELDS: BulkEditField[] = [
  { key: "rating", label: "Rating", type: "rating" },
  { key: "organized", label: "Organized", type: "bool" },
  { key: "studioId", label: "Studio", type: "select", entityType: "studios", nullable: true },
  { key: "date", label: "Date", type: "date" },
  { key: "code", label: "Studio Code", type: "string" },
  { key: "photographer", label: "Photographer", type: "string" },
  { key: "details", label: "Details", type: "string" },
  { key: "tagIds", label: "Tags", type: "multiId", entityType: "tags", modeKey: "tagMode" },
  { key: "performerIds", label: "Performers", type: "multiId", entityType: "performers", modeKey: "performerMode" },
  { key: "galleryIds", label: "Galleries", type: "multiId", entityType: "galleries", modeKey: "galleryMode" },
];

export const AUDIO_BULK_FIELDS: BulkEditField[] = [
  { key: "organized", label: "Organized", type: "bool" },
  { key: "studioId", label: "Studio", type: "select", entityType: "studios", nullable: true },
  { key: "date", label: "Date", type: "date" },
  { key: "code", label: "Studio Code", type: "string" },
  { key: "details", label: "Details", type: "string" },
  { key: "tagIds", label: "Tags", type: "multiId", entityType: "tags", modeKey: "tagMode" },
  { key: "performerIds", label: "Performers", type: "multiId", entityType: "performers", modeKey: "performerMode" },
];

export const TEXT_BULK_FIELDS: BulkEditField[] = [
  { key: "organized", label: "Organized", type: "bool" },
  { key: "studioId", label: "Studio", type: "select", entityType: "studios", nullable: true },
  { key: "date", label: "Date", type: "date" },
  { key: "code", label: "Studio Code", type: "string" },
  { key: "details", label: "Details", type: "string" },
  { key: "tagIds", label: "Tags", type: "multiId", entityType: "tags", modeKey: "tagMode" },
  { key: "performerIds", label: "Performers", type: "multiId", entityType: "performers", modeKey: "performerMode" },
];

export const TAG_BULK_FIELDS: BulkEditField[] = [
  { key: "rating", label: "Rating", type: "rating" },
  { key: "description", label: "Description", type: "string" },
  { key: "color", label: "Badge Color", type: "string" },
  { key: "tagGroupId", label: "Tag Group", type: "select", entityType: "tagGroups", nullable: true },
  { key: "minOccurrenceSec", label: "Min Seconds", type: "number" },
  { key: "minOccurrencePercent", label: "Min Percent", type: "number" },
  { key: "organized", label: "Organized", type: "bool" },
  { key: "favorite", label: "Favorite", type: "bool" },
  { key: "parentIds", label: "Parent Tags", type: "multiId", entityType: "tags", modeKey: "parentMode" },
  { key: "childIds", label: "Child Tags", type: "multiId", entityType: "tags", modeKey: "childMode" },
];

export const STUDIO_BULK_FIELDS: BulkEditField[] = [
  { key: "rating", label: "Rating", type: "rating" },
  { key: "favorite", label: "Favorite", type: "bool" },
  { key: "details", label: "Details", type: "string" },
  { key: "organized", label: "Organized", type: "bool" },
  { key: "tagIds", label: "Tags", type: "multiId", entityType: "tags", modeKey: "tagMode" },
];

export const GROUP_BULK_FIELDS: BulkEditField[] = [
  { key: "rating", label: "Rating", type: "rating" },
  { key: "studioId", label: "Studio", type: "select", entityType: "studios", nullable: true },
  { key: "date", label: "Date", type: "date" },
  { key: "director", label: "Director", type: "string" },
  { key: "description", label: "Description", type: "string" },
  { key: "tagIds", label: "Tags", type: "multiId", entityType: "tags", modeKey: "tagMode" },
];

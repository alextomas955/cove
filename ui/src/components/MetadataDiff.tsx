import { useId, useState, type ReactNode } from "react";

export type DiffSide = "source" | "target";
export type DiffSelection = Record<string, DiffSide | string[]>;
export interface DiffRecord {
  label: string;
  /** Missing keys are unavailable; null is an explicitly empty value. */
  values: Record<string, unknown>;
}
export interface DiffField {
  key: string;
  label: string;
  kind?: "scalar" | "list";
  readOnly?: boolean;
  alwaysVisible?: boolean;
  unavailableLabel?: string;
  render?: (value: unknown) => ReactNode;
  equal?: (left: unknown, right: unknown) => boolean;
  itemKey?: (value: unknown) => string;
  itemLabel?: (value: unknown) => string;
  renderListItem?: (value: unknown, action?: { selected: boolean; toggle: () => void }) => ReactNode;
  additionalItems?: unknown[];
  renderListEditor?: (selected: string[], onChange: (selected: string[]) => void, disabled: boolean) => ReactNode;
}

export const renderDiffValue = (value: unknown): ReactNode => {
  if (value == null || value === "") return <span className="text-secondary italic">Empty</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
};

export function diffListItems(field: DiffField, source: DiffRecord, target: DiffRecord) {
  const key = field.itemKey ?? ((value: unknown) => JSON.stringify(value));
  const sourceItems = new Map(((source.values[field.key] as unknown[]) ?? []).map((value) => [key(value), value]));
  const targetItems = new Map(((target.values[field.key] as unknown[]) ?? []).map((value) => [key(value), value]));
  const addedItems = new Map((field.additionalItems ?? []).map((value) => [key(value), value]));
  return [...new Set([...targetItems.keys(), ...sourceItems.keys(), ...addedItems.keys()])].map((id) => ({
    id,
    source: sourceItems.get(id),
    target: targetItems.get(id),
    result: targetItems.get(id) ?? sourceItems.get(id) ?? addedItems.get(id),
    inSource: sourceItems.has(id),
    inTarget: targetItems.has(id),
  }));
}

export function defaultDiffSelection(fields: DiffField[], source: DiffRecord, target: DiffRecord): DiffSelection {
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.kind === "list"
        ? diffListItems(field, source, target).map((item) => item.id)
        : Object.hasOwn(target.values, field.key)
          ? "target"
          : "source",
    ]),
  );
}

/** Pure comparison controls: adapters own data loading, domain rules, and persistence. */
export function MetadataDiff({
  fields,
  source,
  target,
  value,
  onChange,
  disabled = false,
}: {
  fields: DiffField[];
  source: DiffRecord;
  target: DiffRecord;
  value: DiffSelection;
  onChange: (value: DiffSelection) => void;
  disabled?: boolean;
}) {
  const instanceId = useId();
  const [hideEqual, setHideEqual] = useState(false);
  const labels = [source.label, "Result", target.label];
  const cellClass = "min-w-0 whitespace-pre-wrap break-words rounded-lg border border-border p-3 text-sm";
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-secondary">
        <input type="checkbox" checked={hideEqual} onChange={(event) => setHideEqual(event.target.checked)} /> Hide
        identical fields
      </label>
      <div className="sticky top-0 z-10 hidden grid-cols-3 gap-3 bg-background py-3 md:grid">
        {labels.map((label, index) => (
          <div key={index} className={`font-semibold ${index === 1 ? "text-accent" : ""}`}>
            {label}
          </div>
        ))}
      </div>
      {fields.map((field) => {
        const left = source.values[field.key],
          right = target.values[field.key];
        const availableLeft = Object.hasOwn(source.values, field.key),
          availableRight = Object.hasOwn(target.values, field.key);
        const render = field.render ?? renderDiffValue;
        const items = field.kind === "list" ? diffListItems(field, source, target) : [];
        const equal =
          availableLeft === availableRight &&
          (field.kind === "list"
            ? items.every((item) => item.inSource && item.inTarget)
            : (field.equal ?? ((a, b) => JSON.stringify(a) === JSON.stringify(b)))(left, right));
        if (hideEqual && equal && !field.renderListEditor && !field.alwaysVisible) return null;
        const selected = value[field.key] ?? (availableRight ? "target" : "source");
        return (
          <fieldset key={field.key} disabled={disabled} className="rounded-xl border border-border bg-surface/30 p-3">
            <legend className="px-2 text-sm font-semibold">
              {field.label}
              {equal && <span className="ml-2 font-normal text-secondary">Identical</span>}
            </legend>
            {field.kind === "list" ? (
              <ListDiff
                field={field}
                items={items}
                selected={Array.isArray(selected) ? selected : []}
                sourceLabel={source.label}
                targetLabel={target.label}
                disabled={disabled}
                onChange={(selected) => onChange({ ...value, [field.key]: selected })}
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {(["source", "result", "target"] as const).map((side) => {
                  if (side === "result")
                    return (
                      <div key={side} className={`${cellClass} bg-accent/10`}>
                        <span className="mb-1 block text-xs text-accent">
                          Result · {selected === "source" ? "from source" : "from target"}
                        </span>
                        {(selected === "source" ? availableLeft : availableRight)
                          ? render(selected === "source" ? left : right)
                          : (field.unavailableLabel ?? "Unavailable")}
                      </div>
                    );
                  const available = side === "source" ? availableLeft : availableRight;
                  return (
                    <label
                      key={side}
                      className={`${cellClass} flex cursor-pointer items-start gap-2 ${selected === side ? "border-accent" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`${instanceId}-${field.key}`}
                        aria-label={`${field.label} from ${side}`}
                        checked={selected === side}
                        disabled={!available || disabled || field.readOnly}
                        onChange={() => onChange({ ...value, [field.key]: side })}
                        className="mt-1 accent-accent"
                      />
                      <span>
                        <span className="mb-1 block text-xs text-secondary md:hidden">
                          {side === "source" ? source.label : target.label}
                        </span>
                        {available ? (
                          render(side === "source" ? left : right)
                        ) : (
                          <span className="text-secondary">{field.unavailableLabel ?? "Unavailable"}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

function ListDiff({
  field,
  items,
  selected,
  onChange,
  sourceLabel,
  targetLabel,
  disabled,
}: {
  field: DiffField;
  items: ReturnType<typeof diffListItems>;
  selected: string[];
  onChange: (selected: string[]) => void;
  sourceLabel: string;
  targetLabel: string;
  disabled: boolean;
}) {
  const render = field.render ?? renderDiffValue;
  const groups = [
    { label: "In both", items: items.filter((item) => item.inSource && item.inTarget) },
    { label: "Source only", items: items.filter((item) => item.inSource && !item.inTarget) },
    { label: "Target only", items: items.filter((item) => !item.inSource && item.inTarget) },
    { label: "Added to result", items: items.filter((item) => !item.inSource && !item.inTarget) },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-secondary">Keep</span>
        {(["source", "target", "combined"] as const).map((mode) => {
          const ids = items
            .filter((item) =>
              mode === "source" ? item.inSource : mode === "target" ? item.inTarget : item.inSource || item.inTarget,
            )
            .map((item) => item.id);
          const active = selected.length === ids.length && ids.every((id) => selected.includes(id));
          return (
            <button
              key={mode}
              type="button"
              aria-label={`Use ${mode} ${field.label}`}
              aria-pressed={active}
              onClick={() => onChange(ids)}
              className={`rounded-full border px-3 py-1 text-xs ${active ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary"}`}
            >
              {mode === "source" ? "Source" : mode === "target" ? "Target" : "Combined"}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-secondary">{selected.length} selected</span>
      </div>
      {items.length === 0 && <p className="text-sm text-secondary">No values</p>}
      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.label} aria-label={`${field.label}: ${group.label}`}>
            <h4 className="mb-2 text-xs font-medium text-secondary">
              {group.label} · {group.items.length}
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {(["source", "result", "target"] as const).map((side) => (
                <div
                  key={side}
                  className={`min-w-0 rounded-lg border border-border p-3 ${side === "result" ? "bg-accent/5" : ""}`}
                >
                  <span className="mb-2 block text-xs text-secondary md:hidden">
                    {side === "source" ? sourceLabel : side === "target" ? targetLabel : "Result"}
                  </span>
                  <div className="flex flex-wrap items-start gap-1.5">
                    {group.items.map((item) => {
                      const included = selected.includes(item.id);
                      const toggle = () => {
                        if (!disabled)
                          onChange(included ? selected.filter((id) => id !== item.id) : [...selected, item.id]);
                      };
                      if (field.renderListItem) {
                        if (side !== "result" && !(side === "source" ? item.inSource : item.inTarget)) return null;
                        return (
                          <div key={item.id} className="max-w-full">
                            {field.renderListItem(
                              item[side],
                              side === "result" ? { selected: included, toggle } : undefined,
                            )}
                          </div>
                        );
                      }
                      if (side !== "result")
                        return (side === "source" ? item.inSource : item.inTarget) ? (
                          <span
                            key={item.id}
                            className={
                              field.render
                                ? "max-w-full whitespace-pre-wrap break-words text-sm"
                                : "max-w-full whitespace-pre-wrap break-words rounded bg-card px-2 py-1 text-sm"
                            }
                          >
                            {render(item[side])}
                          </span>
                        ) : null;
                      return (
                        <span
                          key={item.id}
                          className={
                            field.render
                              ? "flex max-w-full cursor-pointer items-center gap-2 text-sm"
                              : "flex max-w-full cursor-pointer items-start gap-2 rounded border border-border bg-card px-2 py-1 text-sm"
                          }
                        >
                          <span
                            className={`min-w-0 whitespace-pre-wrap break-words ${selected.includes(item.id) ? "" : "text-secondary line-through"}`}
                          >
                            {render(item.result)}
                          </span>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={toggle}
                            aria-label={`${included ? "Remove" : "Add"} ${field.label}: ${field.itemLabel?.(item.result) ?? item.id}`}
                            className="shrink-0 text-muted hover:text-foreground"
                          >
                            {included ? "×" : "+"}
                          </button>
                        </span>
                      );
                    })}
                    {side !== "result" &&
                      !group.items.some((item) => (side === "source" ? item.inSource : item.inTarget)) && (
                        <span className="text-sm text-secondary">—</span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      {field.renderListEditor?.(selected, onChange, disabled)}
    </div>
  );
}

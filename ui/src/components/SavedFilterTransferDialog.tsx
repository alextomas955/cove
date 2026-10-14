import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Copy, Loader2, X } from "lucide-react";
import { savedFilters } from "../api/client";
import type { SavedFilter } from "../api/types";
import type { CriterionDefinition, EntityType } from "./filterCriteriaTypes";
import { migrateLegacyPerformerFavoriteCriterion } from "./filterCriterionState";
import { SavedFilterPicker } from "./SavedFilterPicker";
import {
  buildPortableSavedFilter,
  collectEntityIdReferences,
  entityReferenceKey,
  inspectPortableObjectFilter,
  parsePortableSavedFilter,
  parseSavedFilterObjectFilter,
  PortableSavedFilterError,
  portableReferenceKey,
  resolvePortableObjectFilter,
  type PortableEntityReference,
  type PortableSavedFilter,
  type ResolvedEntityReference,
} from "../utils/portableSavedFilter";
import {
  CREATABLE_REFERENCE_TYPES,
  createEntityFromReference,
  describeEntityReference,
  matchEntityReference,
} from "../utils/savedFilterReferences";

const ENTITY_LABELS: Record<EntityType, { singular: string; plural: string; title: string }> = {
  tags: { singular: "tag", plural: "tags", title: "Tag" },
  tagGroups: { singular: "tag group", plural: "tag groups", title: "Tag group" },
  performers: { singular: "performer", plural: "performers", title: "Performer" },
  studios: { singular: "studio", plural: "studios", title: "Studio" },
  groups: { singular: "group", plural: "groups", title: "Group" },
  galleries: { singular: "gallery", plural: "galleries", title: "Gallery" },
  videos: { singular: "video", plural: "videos", title: "Video" },
  audios: { singular: "audio", plural: "audios", title: "Audio" },
  faces: { singular: "face", plural: "faces", title: "Face" },
};

function countLabel(count: number, entityType: EntityType) {
  const labels = ENTITY_LABELS[entityType];
  return `${count} ${count === 1 ? labels.singular : labels.plural}`;
}

function summarizeByType(entityTypes: EntityType[]) {
  const counts = new Map<EntityType, number>();
  for (const entityType of entityTypes) counts.set(entityType, (counts.get(entityType) ?? 0) + 1);
  return [...counts].map(([entityType, count]) => countLabel(count, entityType));
}

function joinWithAnd(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

const inputClassName =
  "w-full rounded-md border border-border bg-card/70 px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent";

type Tab = "export" | "import";
const TABS: { id: Tab; label: string }[] = [
  { id: "export", label: "Export" },
  { id: "import", label: "Import" },
];

/** Mounted only while open, so every opening starts on the Export tab with a clean import form. */
interface SavedFilterTransferDialogProps {
  /** Called to close; the opener restores focus, since the control that opened the dialog is usually gone by then. */
  onClose: () => void;
  mode: string;
  filters: SavedFilter[];
  criteria: CriterionDefinition[];
}

export function SavedFilterTransferDialog({ onClose, mode, filters, criteria }: SavedFilterTransferDialogProps) {
  const [tab, setTab] = useState<Tab>("export");
  const dialogRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<Tab, HTMLButtonElement>());
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const tabId = (id: Tab) => `${idPrefix}-tab-${id}`;
  const panelId = `${idPrefix}-panel`;

  useEffect(() => {
    const focusTimer = window.setTimeout(() => tabRefs.current.get("export")?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, []);

  const selectTab = (next: Tab) => {
    setTab(next);
    tabRefs.current.get(next)?.focus();
  };

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    selectTab(tab === "export" ? "import" : "export");
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Escape" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    // The inactive tab's panel stays mounted but hidden, so its controls are not part of the cycle.
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]):not([tabindex='-1']), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ),
    ).filter((element) => !element.closest("[hidden]"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain py-8">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className="relative mx-4 flex w-full max-w-2xl flex-col rounded-lg border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h3 id={titleId} className="flex-1 text-sm font-semibold">
            Import / Export saved filter
          </h3>
          <div
            role="tablist"
            aria-label="Import or export"
            className="flex overflow-hidden rounded-md border border-border"
          >
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                ref={(button) => {
                  if (button) tabRefs.current.set(id, button);
                  else tabRefs.current.delete(id);
                }}
                id={tabId(id)}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls={panelId}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={handleTabKeyDown}
                className={`px-3 py-1 text-xs transition-colors ${
                  tab === id ? "bg-accent/15 text-foreground" : "text-secondary hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div id={panelId} role="tabpanel" aria-labelledby={tabId(tab)}>
          {/* Both stay mounted so switching tabs keeps a pasted import and what an earlier attempt created. */}
          <div hidden={tab !== "export"}>
            <ExportPanel mode={mode} filters={filters} criteria={criteria} onClose={onClose} />
          </div>
          <div hidden={tab !== "import"}>
            <ImportPanel mode={mode} filters={filters} criteria={criteria} onClose={onClose} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Criterion definitions can arrive after the dialog opens (extension filters load separately); a result computed with
// different definitions must not be reused.
function criteriaSignature(criteria: CriterionDefinition[]) {
  return criteria
    .map((criterion) => `${criterion.filterKey}:${criterion.type}:${criterion.entityType ?? ""}`)
    .join("|");
}

/**
 * Applies the exporter's choices: display options can be left out entirely, and sorting and page size can be left
 * out while a saved search term (part of what the filter matches) stays.
 */
function withExportOptions(
  portable: PortableSavedFilter,
  { includeDisplayOptions, includeSortAndPaging }: { includeDisplayOptions: boolean; includeSortAndPaging: boolean },
): PortableSavedFilter {
  const { format, version, mode, name, findFilter, objectFilter, uiOptions } = portable;
  const keptFindFilter = includeSortAndPaging ? findFilter : findFilter?.q ? { q: findFilter.q } : undefined;
  return {
    format,
    version,
    mode,
    name,
    ...(keptFindFilter ? { findFilter: keptFindFilter } : {}),
    ...(objectFilter ? { objectFilter } : {}),
    ...(includeDisplayOptions && uiOptions ? { uiOptions } : {}),
  };
}

function OmittedConditions({ verb, conditions }: { verb: string; conditions: string[] }) {
  if (conditions.length === 0) return null;
  return (
    <p className="text-xs text-yellow-400">
      {conditions.length === 1 ? "1 condition" : `${conditions.length} conditions`} {verb}: {joinWithAnd(conditions)}.
    </p>
  );
}

function ExportPanel({
  mode,
  filters,
  criteria,
  onClose,
}: {
  mode: string;
  filters: SavedFilter[];
  criteria: CriterionDefinition[];
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [includeDisplayOptions, setIncludeDisplayOptions] = useState(false);
  const [includeSortAndPaging, setIncludeSortAndPaging] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const jsonId = useId();
  // Falls back to the first filter until one is chosen, or when the chosen one is deleted meanwhile.
  const selected = filters.find((filter) => filter.id === selectedId) ?? filters[0] ?? null;

  const exported = useQuery({
    queryKey: [
      "saved-filter-export",
      mode,
      selected?.id,
      selected?.objectFilter,
      selected?.findFilter,
      selected?.uiOptions,
      criteriaSignature(criteria),
    ],
    enabled: selected != null,
    // The key covers everything the result depends on; refetching on focus would only blank the preview.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const filter = selected!;
      // Older saved filters can still hold a criterion the list editor migrates on open; export the migrated form.
      const objectFilter = migrateLegacyPerformerFavoriteCriterion(parseSavedFilterObjectFilter(filter), criteria);
      const ids = collectEntityIdReferences(objectFilter, criteria, mode);
      const described = await Promise.all(ids.map(({ entityType, id }) => describeEntityReference(entityType, id)));
      const references = new Map<string, PortableEntityReference>();
      const unavailable: EntityType[] = [];
      described.forEach((reference, index) => {
        const { entityType, id } = ids[index];
        if (reference) references.set(entityReferenceKey(entityType, id), reference);
        else unavailable.push(entityType);
      });
      const { filter: portable, omitted } = buildPortableSavedFilter(
        { ...filter, objectFilter: JSON.stringify(objectFilter) },
        criteria,
        references,
      );
      return {
        portable,
        // Counted from the result, so references in conditions that were removed are not reported as exported.
        included: inspectPortableObjectFilter(portable.objectFilter, criteria, mode).references.map(
          (reference) => reference.$ref,
        ),
        unavailable,
        omitted,
      };
    },
  });
  const json = useMemo(() => {
    if (!exported.data) return null;
    const portable = withExportOptions(exported.data.portable, { includeDisplayOptions, includeSortAndPaging });
    return JSON.stringify(portable, null, 2);
  }, [exported.data, includeDisplayOptions, includeSortAndPaging]);
  const result = exported.data && json != null ? { ...exported.data, json } : undefined;

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.json);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  if (!selected) {
    return <p className="px-4 py-6 text-sm text-muted">There are no saved filters on this list to export.</p>;
  }

  const included = result ? summarizeByType(result.included) : [];
  return (
    <>
      <div className="space-y-3 px-4 py-4">
        <div className="space-y-1">
          <span className="text-xs text-secondary">Saved filter</span>
          <SavedFilterPicker
            mode={mode}
            filters={filters}
            selectedId={selected.id}
            label="Saved filter to export"
            onSelect={(filter) => {
              setSelectedId(filter.id);
              setCopyState("idle");
            }}
          />
        </div>
        <div className="space-y-1.5">
          {/* The JSON itself rarely matters to the exporter, so it stays folded behind the summary. */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => setShowJson((shown) => !shown)}
              aria-expanded={showJson}
              aria-controls={jsonId}
              className="inline-flex items-center gap-1 text-secondary hover:text-foreground"
            >
              {showJson ? (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              )}
              JSON
            </button>
            {result ? (
              <span className="text-right text-muted">
                {included.length > 0 ? `${joinWithAnd(included)}, by name and remote ID` : "No linked items"}
              </span>
            ) : (
              !exported.isError && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-label="Preparing export" />
              )
            )}
          </div>
          {exported.isError ? (
            <p role="alert" className="rounded-md border border-border px-3 py-2 text-xs text-red-400">
              Could not prepare this saved filter for export. {exported.error.message}
            </p>
          ) : (
            showJson &&
            result && (
              <textarea
                id={jsonId}
                readOnly
                value={result.json}
                aria-label="Exported saved filter JSON"
                spellCheck={false}
                onFocus={(event) => event.currentTarget.select()}
                className="h-64 w-full resize-y overscroll-contain rounded-md border border-border bg-card/40 px-3 py-2 font-mono text-xs leading-relaxed text-secondary focus:outline-none focus:border-accent"
              />
            )
          )}
          {result && result.unavailable.length > 0 && (
            <p className="text-xs text-yellow-400">
              Left out {joinWithAnd(summarizeByType(result.unavailable))} that no longer exist or have no name to match
              by.
            </p>
          )}
          {result && (
            <OmittedConditions
              verb="can’t be exported without Cove IDs and were left out"
              conditions={result.omitted}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-secondary">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={includeDisplayOptions}
              onChange={(event) => {
                setIncludeDisplayOptions(event.target.checked);
                setCopyState("idle");
              }}
              className="accent-accent"
            />
            Display options (layout, zoom, columns)
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={includeSortAndPaging}
              onChange={(event) => {
                setIncludeSortAndPaging(event.target.checked);
                setCopyState("idle");
              }}
              className="accent-accent"
            />
            Sorting and page size
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <span role="status" className="flex-1 text-xs text-muted">
          {copyState === "copied"
            ? "Copied to clipboard."
            : copyState === "failed"
              ? "Could not reach the clipboard. Select the JSON and copy it instead."
              : ""}
        </span>
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-secondary hover:text-foreground">
          Close
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!result}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {copyState === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy to clipboard
        </button>
      </div>
    </>
  );
}

type ParsedImport = { filter: PortableSavedFilter; error?: never } | { filter?: never; error: string };

function parseImport(text: string, mode: string): ParsedImport | null {
  if (!text.trim()) return null;
  try {
    const filter = parsePortableSavedFilter(text);
    if (filter.mode.trim().toLowerCase() !== mode.trim().toLowerCase()) {
      return { error: `This saved filter belongs to the “${filter.mode}” list. Import it there instead.` };
    }
    return { filter };
  } catch (error) {
    return {
      error: error instanceof PortableSavedFilterError ? error.message : "This saved filter could not be read.",
    };
  }
}

function ImportPanel({
  mode,
  filters,
  criteria,
  onClose,
}: {
  mode: string;
  filters: SavedFilter[];
  criteria: CriterionDefinition[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  // Missing references are created unless unticked; keyed by portable reference key.
  const [skipCreate, setSkipCreate] = useState<ReadonlySet<string>>(new Set());
  // Entities created by an attempt that failed later, kept for the dialog's lifetime so a retry (even after editing
  // the JSON) reuses them instead of colliding with them.
  const createdRef = useRef(new Map<string, ResolvedEntityReference>());
  const textId = useId();
  const nameId = useId();
  const nameErrorId = useId();

  const parsed = useMemo(() => parseImport(text, mode), [text, mode]);
  const filter = parsed?.filter;
  const inspection = useMemo(
    () => (filter ? inspectPortableObjectFilter(filter.objectFilter, criteria, mode) : null),
    [filter, criteria, mode],
  );
  const references = inspection?.references ?? [];
  const referenceKeys = references.map(portableReferenceKey);

  const matches = useQuery({
    queryKey: ["saved-filter-import-matches", referenceKeys],
    enabled: filter != null,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: () => Promise.all(references.map((reference) => matchEntityReference(reference))),
  });

  const name = nameDraft ?? filter?.name ?? "";
  const normalizedName = name.trim().toLocaleLowerCase();
  const duplicateName =
    !!normalizedName && filters.some((existing) => existing.name.trim().toLocaleLowerCase() === normalizedName);

  const rows = references.map((reference, index) => {
    const key = referenceKeys[index];
    const match = matches.data?.[index] ?? null;
    const creatable = !match && CREATABLE_REFERENCE_TYPES.has(reference.$ref);
    return { reference, key, match, creatable, create: creatable && !skipCreate.has(key) };
  });
  const toCreate = rows.filter((row) => row.create);
  const leftOut = rows.filter((row) => !row.match && !row.create);

  const importMut = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async () => {
      const resolved = new Map<string, ResolvedEntityReference>();
      for (const row of rows) if (row.match) resolved.set(row.key, row.match);
      for (const row of toCreate) {
        const created = createdRef.current.get(row.key) ?? (await createEntityFromReference(row.reference));
        createdRef.current.set(row.key, created);
        resolved.set(row.key, created);
      }
      const objectFilter = resolvePortableObjectFilter(
        filter!.objectFilter,
        criteria,
        mode,
        (reference) => resolved.get(portableReferenceKey(reference)) ?? null,
      );
      return savedFilters.create({
        mode,
        name: name.trim(),
        findFilter: JSON.stringify(filter!.findFilter ?? {}),
        objectFilter: Object.keys(objectFilter).length > 0 ? JSON.stringify(objectFilter) : undefined,
        uiOptions: filter!.uiOptions ? JSON.stringify(filter!.uiOptions) : undefined,
      });
    },
    // Refresh the matches so anything created before the failure shows as found.
    onError: () => queryClient.invalidateQueries({ queryKey: ["saved-filter-import-matches"] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      onClose();
    },
  });

  const canImport =
    !!filter && matches.isSuccess && !matches.isFetching && !!normalizedName && !duplicateName && !importMut.isPending;
  const footer =
    toCreate.length > 0 ? `Creates ${joinWithAnd(summarizeByType(toCreate.map((row) => row.reference.$ref)))}` : "";

  return (
    <>
      <div className="space-y-3 px-4 py-4">
        <div className="space-y-1">
          <label htmlFor={textId} className="text-xs text-secondary">
            Paste exported JSON
          </label>
          <textarea
            id={textId}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setNameDraft(null);
              setSkipCreate(new Set());
              importMut.reset();
            }}
            rows={6}
            spellCheck={false}
            placeholder='{ "format": "cove.savedFilter", … }'
            className="w-full resize-y overscroll-contain rounded-md border border-border bg-card/40 px-3 py-2 font-mono text-xs leading-relaxed text-secondary placeholder:text-muted focus:outline-none focus:border-accent"
          />
          {parsed?.error && (
            <p role="alert" className="text-xs text-red-400">
              {parsed.error}
            </p>
          )}
        </div>

        {filter && (
          <>
            {references.length === 0 ? (
              <p className="text-xs text-muted">
                This saved filter does not refer to any tags, performers, studios or other items.
              </p>
            ) : matches.isPending ? (
              <p className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Looking for {references.length === 1 ? "1 linked item" : `${references.length} linked items`} in this
                library…
              </p>
            ) : matches.isError ? (
              <p role="alert" className="text-xs text-red-400">
                Could not look up the items this saved filter refers to.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-card/60 text-[10px] uppercase tracking-wider text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        In this library
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const labels = ENTITY_LABELS[row.reference.$ref];
                      return (
                        <tr key={row.key} className="border-t border-border">
                          <td className="px-3 py-2 text-secondary">{labels.title}</td>
                          <td className="px-3 py-2 text-foreground">
                            {row.reference.name}
                            {row.reference.disambiguation && (
                              <span className="text-muted"> ({row.reference.disambiguation})</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {row.match ? (
                              <span className="inline-flex items-center gap-1 text-green-400">
                                <Check className="h-3 w-3" />
                                {row.match.matchedBy === "remoteId" ? "Found by remote ID" : "Found by name"}
                              </span>
                            ) : row.creatable ? (
                              <label className="inline-flex items-center gap-1.5 text-yellow-400">
                                <input
                                  type="checkbox"
                                  checked={row.create}
                                  aria-label={`Create ${labels.singular} “${row.reference.name}”`}
                                  onChange={(event) => {
                                    const next = new Set(skipCreate);
                                    if (event.target.checked) next.delete(row.key);
                                    else next.add(row.key);
                                    setSkipCreate(next);
                                  }}
                                  className="accent-accent"
                                />
                                Not found · create {labels.singular}
                              </label>
                            ) : (
                              <span className="text-yellow-400">Not found · left out</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {leftOut.length > 0 && matches.isSuccess && (
              <p className="text-xs text-muted">
                Items that are not found or created are left out, and a condition left with nothing to match is removed.
              </p>
            )}
            <OmittedConditions
              verb="can’t be imported on this list and will be left out"
              conditions={inspection?.omitted ?? []}
            />
            <div className="space-y-1">
              <label htmlFor={nameId} className="text-xs text-secondary">
                Save as
              </label>
              <input
                id={nameId}
                type="text"
                value={name}
                aria-invalid={duplicateName || undefined}
                aria-describedby={duplicateName ? nameErrorId : undefined}
                onChange={(event) => {
                  setNameDraft(event.target.value);
                  importMut.reset();
                }}
                className={inputClassName}
              />
              {duplicateName && (
                <p id={nameErrorId} className="text-xs text-red-400">
                  A saved filter with this name already exists.
                </p>
              )}
            </div>
          </>
        )}
        {importMut.isError && (
          <p role="alert" className="text-xs text-red-400">
            Could not import this saved filter. {importMut.error.message}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <span className="flex-1 text-xs text-secondary">{footer}</span>
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-secondary hover:text-foreground">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => importMut.mutate()}
          disabled={!canImport}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {importMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Import filter
        </button>
      </div>
    </>
  );
}

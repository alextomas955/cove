import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import type { SavedFilter } from "../api/types";
import {
  groupSavedFilters,
  readCollapsedSavedFilterGroups,
  writeCollapsedSavedFilterGroups,
} from "../utils/savedFilterGroups";
import { highlightSavedFilterMatch } from "./savedFilterHighlight";

/**
 * Chooses one saved filter from a list laid out like the saved-filter menu: the same search header, groups (sharing
 * the menu's collapsed state for the mode) and rows. Arrow keys in the search move the selection through the
 * visible filters.
 */
export function SavedFilterPicker({
  mode,
  filters,
  selectedId,
  onSelect,
  label,
}: {
  mode: string;
  filters: SavedFilter[];
  selectedId: number | null;
  onSelect: (filter: SavedFilter) => void;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState(() => readCollapsedSavedFilterGroups(mode));
  const listRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();
  const listId = `${idPrefix}-list`;
  const optionId = (id: number) => `${idPrefix}-option-${id}`;

  const searching = query.trim().length > 0;
  const sections = groupSavedFilters(filters, query);
  const isCollapsed = (group: string) => !searching && collapsedGroups.includes(group.toLocaleLowerCase());
  const visibleFilters = sections.flatMap((section) =>
    section.group != null && isCollapsed(section.group) ? [] : section.items.map((item) => item.filter),
  );
  const matchCount = sections.reduce((count, section) => count + section.items.length, 0);
  const selectedVisible = visibleFilters.some((filter) => filter.id === selectedId);

  useEffect(() => {
    if (selectedId == null) return;
    listRef.current?.querySelector(`[data-saved-filter-id="${selectedId}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [selectedId]);

  const toggleGroup = (group: string) => {
    const key = group.toLocaleLowerCase();
    const next = collapsedGroups.includes(key)
      ? collapsedGroups.filter((collapsed) => collapsed !== key)
      : [...collapsedGroups, key];
    setCollapsedGroups(next);
    writeCollapsedSavedFilterGroups(mode, next);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (visibleFilters.length === 0) return;
    const index = visibleFilters.findIndex((filter) => filter.id === selectedId);
    const next =
      index < 0
        ? 0
        : event.key === "ArrowDown"
          ? Math.min(index + 1, visibleFilters.length - 1)
          : Math.max(index - 1, 0);
    onSelect(visibleFilters[next]);
  };

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card/40">
      <label className="flex items-center gap-1.5 border-b border-border p-2 transition-colors focus-within:border-accent">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Saved filters"
          aria-label={`Search ${label.toLocaleLowerCase()}`}
          aria-controls={listId}
          aria-activedescendant={selectedVisible && selectedId != null ? optionId(selectedId) : undefined}
          autoComplete="off"
          spellCheck={false}
          className="h-[15px] min-w-0 flex-1 bg-transparent text-xs leading-[15px] text-foreground outline-none placeholder:text-[10px] placeholder:font-medium placeholder:uppercase placeholder:tracking-wider placeholder:text-muted"
        />
        {searching ? (
          <span className="shrink-0 text-[10px] text-muted tabular-nums" aria-hidden="true">
            {matchCount}/{filters.length}
          </span>
        ) : (
          <Search className="h-3 w-3 shrink-0 text-muted opacity-60" aria-hidden="true" />
        )}
        <span className="sr-only" aria-live="polite">
          {searching ? `${matchCount} of ${filters.length} saved filters match` : ""}
        </span>
      </label>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        className="max-h-52 overflow-y-auto overscroll-contain"
      >
        {searching && matchCount === 0 && <p className="px-3 py-2 text-xs text-muted">No saved filters match</p>}
        {sections.map((section) => {
          const collapsed = section.group != null && isCollapsed(section.group);
          return (
            <div
              key={section.group ?? ""}
              role="group"
              aria-label={section.group ?? "Ungrouped"}
              className={section.group == null && sections.length > 1 ? "mt-1 border-t border-border/60" : undefined}
            >
              {section.group != null && (
                <button
                  type="button"
                  onClick={() => toggleGroup(section.group!)}
                  disabled={searching}
                  aria-expanded={!collapsed}
                  aria-label={`${section.group}, ${section.items.length} ${section.items.length === 1 ? "filter" : "filters"}`}
                  className="flex w-full items-center gap-1 px-2 pt-2 pb-1 text-left text-[11px] font-semibold text-secondary hover:text-foreground disabled:hover:text-secondary"
                >
                  {collapsed ? (
                    <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                  <span className="min-w-0 truncate">{highlightSavedFilterMatch(section.group, query)}</span>
                  <span className="ml-auto pl-2 text-[10px] font-normal text-muted tabular-nums">
                    {section.items.length}
                  </span>
                </button>
              )}
              {!collapsed &&
                section.items.map(({ filter, label: itemLabel }) => {
                  const selected = filter.id === selectedId;
                  return (
                    <div
                      key={filter.id}
                      id={optionId(filter.id)}
                      data-saved-filter-id={filter.id}
                      role="option"
                      aria-selected={selected}
                      onClick={() => onSelect(filter)}
                      className={`flex cursor-pointer items-center gap-2 py-1.5 text-xs hover:bg-card/80 ${
                        section.group != null ? "pl-6 pr-3" : "px-3"
                      } ${selected ? "bg-accent/10 text-accent" : "text-foreground"}`}
                    >
                      <span className="min-w-0 flex-1 truncate" title={filter.name}>
                        {highlightSavedFilterMatch(itemLabel, query)}
                      </span>
                      {selected && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

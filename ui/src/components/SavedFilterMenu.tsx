import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { savedFilters } from "../api/client";
import type { FindFilter, SavedFilter, SavedFilterUIOptions } from "../api/types";
import { Bookmark, Check, ChevronDown, ChevronRight, Loader2, Pencil, Save, Search, Star, Trash2 } from "lucide-react";
import { getDefaultFilter, normalizeSavedFindFilter } from "../utils/defaultSavedFilter";
import { groupSavedFilters, SAVED_FILTER_GROUP_SEPARATOR } from "../utils/savedFilterGroups";
import { updateAuthenticatedUserUiPreferences } from "../utils/userUiPreferences";

export { getDefaultFilter, resolveSavedDisplayMode } from "../utils/defaultSavedFilter";

// Random sort seeds are intentionally not persisted: a saved/default filter using random sort
// should re-shuffle on every load rather than reproduce the same order. Drop the seed on save.
function stripRandomSeed(findFilter: FindFilter): FindFilter {
  if (findFilter.sort === "random" && findFilter.seed != null) {
    const { seed: _seed, ...rest } = findFilter;
    return rest;
  }
  return findFilter;
}

/**
 * Applies a mode's default saved filter exactly once on mount. Lets embedded list views inside
 * detail pages (a performer's videos, a studio's galleries, …) honor the user's default the same
 * way the top-level list pages do. `apply` receives the default's findFilter, objectFilter, and
 * UI options (if any).
 */
export function useDefaultSavedFilterOnMount(
  mode: string,
  apply: (
    findFilter: FindFilter | undefined,
    objectFilter: Record<string, unknown> | undefined,
    uiOptions: SavedFilterUIOptions | undefined,
  ) => void,
) {
  const appliedRef = useRef(false);
  const applyDefault = useEffectEvent(() => {
    const def = getDefaultFilter(mode);
    if (def) apply(def.findFilter, def.objectFilter, def.uiOptions);
  });
  // Intentionally mount-only: the default is a starting point the user can then change.
  useEffect(() => {
    if (appliedRef.current) return;
    appliedRef.current = true;
    applyDefault();
  }, []);
}

/** Set the default filter for a mode (account-backed when signed in, plus a browser-local fallback). */
function setDefaultFilter(
  mode: string,
  findFilter: FindFilter,
  objectFilter?: Record<string, unknown>,
  uiOptions?: SavedFilterUIOptions,
) {
  const json = JSON.stringify({ findFilter: stripRandomSeed(findFilter), objectFilter, uiOptions });
  const key = mode.trim().toLowerCase();
  localStorage.setItem(`cove-default-filter-${mode}`, json);
  updateAuthenticatedUserUiPreferences((current) => ({
    ...current,
    defaultFilters: { ...current?.defaultFilters, [key]: json },
  }));
}

/** Clear the default filter for a mode (both account-backed and browser-local copies). */
function clearDefaultFilter(mode: string) {
  const key = mode.trim().toLowerCase();
  localStorage.removeItem(`cove-default-filter-${mode}`);
  updateAuthenticatedUserUiPreferences((current) => {
    if (!current?.defaultFilters || !(key in current.defaultFilters)) return current;
    const next = { ...current.defaultFilters };
    delete next[key];
    return { ...current, defaultFilters: Object.keys(next).length > 0 ? next : null };
  });
}

// Which saved-filter groups are collapsed is a per-browser convenience, keyed by mode with lower-cased group names.
function collapsedGroupsStorageKey(mode: string) {
  return `cove-saved-filter-collapsed-groups-${mode.trim().toLowerCase()}`;
}

function readCollapsedGroups(mode: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(collapsedGroupsStorageKey(mode)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((group): group is string => typeof group === "string") : [];
  } catch {
    return [];
  }
}

function writeCollapsedGroups(mode: string, groups: string[]) {
  try {
    if (groups.length > 0) localStorage.setItem(collapsedGroupsStorageKey(mode), JSON.stringify(groups));
    else localStorage.removeItem(collapsedGroupsStorageKey(mode));
  } catch {
    // Storage can be unavailable (private windows, blocked site data); groups then reset per page load.
  }
}

function prefersTouch() {
  return window.matchMedia?.("(pointer: coarse)").matches === true;
}

function highlightMatch(text: string, query: string): ReactNode {
  const normalized = query.trim().toLocaleLowerCase();
  const index = normalized ? text.toLocaleLowerCase().indexOf(normalized) : -1;
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-accent/25 text-inherit">{text.slice(index, index + normalized.length)}</mark>
      {text.slice(index + normalized.length)}
    </>
  );
}

interface SavedFilterMenuProps {
  mode: string;
  /**
   * Storage key for the *default* (auto-applied) filter. Defaults to `mode`. Pass a distinct value to
   * give a view its own default that doesn't collide with another view sharing the same `mode` — e.g.
   * the images list inside a gallery shares the "images" named-filter library but wants its own default.
   */
  defaultFilterKey?: string;
  currentFilter: FindFilter;
  currentObjectFilter?: Record<string, unknown>;
  currentUIOptions?: SavedFilterUIOptions;
  onApplyFilter: (filter: FindFilter) => void;
  onApplyObjectFilter?: (filter: Record<string, unknown>) => void;
  onApplyUIOptions?: (options: SavedFilterUIOptions) => void;
}

function SavedFilterName({
  id,
  name,
  label,
  onClick,
}: {
  id?: string;
  name: string;
  label?: ReactNode;
  onClick: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{ top: number; left: number; maxWidth: number } | null>(null);

  const showTooltipIfTruncated = () => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    const button = buttonRef.current;
    if (!button || button.scrollWidth <= button.clientWidth) {
      setTooltip(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const viewportPadding = 8;
    const left = Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - viewportPadding);
    setTooltip({
      top: rect.bottom + 6,
      left,
      maxWidth: Math.max(0, window.innerWidth - left - viewportPadding),
    });
  };

  const hideTooltip = () => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setTooltip(null), 100);
  };

  useEffect(
    () => () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    },
    [],
  );

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        onClick={onClick}
        onPointerEnter={showTooltipIfTruncated}
        onPointerLeave={hideTooltip}
        onFocus={showTooltipIfTruncated}
        onBlur={hideTooltip}
        aria-describedby={tooltip ? tooltipId : undefined}
        className="saved-filter-name flex-1 text-left text-xs text-foreground hover:text-accent"
      >
        {label ?? name}
      </button>
      {tooltip &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            onPointerEnter={() => {
              if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
            }}
            onPointerLeave={hideTooltip}
            className="fixed z-[100] rounded border border-border bg-card px-2 py-1 text-xs text-foreground shadow-lg"
            style={{ top: tooltip.top, left: tooltip.left, maxWidth: tooltip.maxWidth, overflowWrap: "anywhere" }}
          >
            {name}
          </div>,
          document.body,
        )}
    </>
  );
}

export function SavedFilterMenu({
  mode,
  defaultFilterKey,
  currentFilter,
  currentObjectFilter,
  currentUIOptions,
  onApplyFilter,
  onApplyObjectFilter,
  onApplyUIOptions,
}: SavedFilterMenuProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [query, setQuery] = useState("");
  // The highlight follows a filter rather than a position, so deleting, renaming, or a refetch cannot move it.
  const [activeId, setActiveId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState(() => readCollapsedGroups(mode));
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const focusRenameInputRef = useRef(false);
  const idPrefix = useId();
  const listId = `${idPrefix}-list`;
  const filterButtonId = (id: number) => `${idPrefix}-filter-${id}`;
  // The widest the panel has been while open; kept as its minimum so narrowing the list by search does not shrink it.
  const openWidthRef = useRef(0);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    maxWidth: number;
    minWidth: number;
  } | null>(null);
  // Named saved filters are keyed by `mode` (server-side, enum-validated); the auto-applied default
  // is keyed separately so views sharing a `mode` can still keep independent defaults.
  const defaultKey = defaultFilterKey ?? mode;
  const hasDefault = !!getDefaultFilter(defaultKey);

  const { data: filters } = useQuery({
    queryKey: ["saved-filters", mode],
    queryFn: () => savedFilters.list(mode),
  });

  // Closing unmounts the panel; when focus was inside it, hand focus back to the trigger instead of dropping it on
  // the page body. Clicking elsewhere closes without this, since that click already decides where focus goes.
  const closeMenu = () => {
    if (panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true });
    setOpen(false);
  };
  const closeMenuEvent = useEffectEvent(closeMenu);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) closeMenuEvent();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setPanelPosition(null);
      setQuery("");
      setActiveId(null);
      setRenamingId(null);
    } else {
      // Another menu for the same mode may have collapsed or expanded groups since this one was last open.
      setCollapsedGroups(readCollapsedGroups(mode));
    }
  }

  useLayoutEffect(() => {
    if (!open) {
      openWidthRef.current = 0;
      return;
    }

    const positionPanel = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const viewportPadding = 8;
      const visualViewport = window.visualViewport;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
      const viewportRight = viewportLeft + (visualViewport?.width ?? window.innerWidth);
      const maxHeight = Math.max(0, viewportBottom - viewportTop - viewportPadding * 2);
      const maxWidth = Math.max(0, viewportRight - viewportLeft - viewportPadding * 2);
      panel.style.maxHeight = `${maxHeight}px`;
      panel.style.maxWidth = `${maxWidth}px`;
      const minWidth = Math.min(Math.max(224, openWidthRef.current), maxWidth);
      panel.style.minWidth = `${minWidth}px`;
      const triggerRect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      openWidthRef.current = Math.max(openWidthRef.current, panelRect.width);
      // Typing in the panel can raise a mobile keyboard that scrolls the trigger away. The search box is focused on
      // every desktop open, so it only counts once the user is actually typing in it (or on a touch device).
      const active = document.activeElement;
      const editingInsidePanel =
        active instanceof HTMLInputElement &&
        panel.contains(active) &&
        (active !== searchRef.current || active.value !== "" || prefersTouch());
      if ((triggerRect.bottom < viewportTop || triggerRect.top > viewportBottom) && !editingInsidePanel) {
        closeMenuEvent();
        return;
      }
      const below = triggerRect.bottom + 4;
      const above = triggerRect.top - panelRect.height - 4;
      const preferredTop =
        below + panelRect.height <= viewportBottom - viewportPadding
          ? below
          : above >= viewportTop + viewportPadding
            ? above
            : viewportTop + viewportPadding;
      const top = Math.min(
        Math.max(preferredTop, viewportTop + viewportPadding),
        Math.max(viewportTop + viewportPadding, viewportBottom - panelRect.height - viewportPadding),
      );
      setPanelPosition({
        top,
        left: Math.min(
          Math.max(triggerRect.right - panelRect.width, viewportLeft + viewportPadding),
          viewportRight - panelRect.width - viewportPadding,
        ),
        maxHeight,
        maxWidth,
        minWidth: Math.min(Math.max(224, openWidthRef.current), maxWidth),
      });
    };

    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    window.visualViewport?.addEventListener("resize", positionPanel);
    window.visualViewport?.addEventListener("scroll", positionPanel);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(positionPanel) : null;
    if (panelRef.current) resizeObserver?.observe(panelRef.current);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
      window.visualViewport?.removeEventListener("resize", positionPanel);
      window.visualViewport?.removeEventListener("scroll", positionPanel);
      resizeObserver?.disconnect();
    };
  }, [open, filters]);

  const createMut = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: () =>
      savedFilters.create({
        mode,
        name: saveName,
        findFilter: JSON.stringify(stripRandomSeed(currentFilter)),
        objectFilter:
          currentObjectFilter && Object.keys(currentObjectFilter).length > 0
            ? JSON.stringify(currentObjectFilter)
            : undefined,
        uiOptions:
          currentUIOptions && Object.keys(currentUIOptions).length > 0 ? JSON.stringify(currentUIOptions) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      setSaveName("");
      setShowSave(false);
    },
  });

  const updateMut = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: (id: number) =>
      savedFilters.update(id, {
        findFilter: JSON.stringify(stripRandomSeed(currentFilter)),
        objectFilter: JSON.stringify(currentObjectFilter ?? {}),
        uiOptions: JSON.stringify(currentUIOptions ?? {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      closeMenu();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => savedFilters.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
    },
  });

  const renameMut = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: ({ id, name }: { id: number; name: string }) => savedFilters.update(id, { name }),
    onSuccess: (_saved, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      finishRename(id);
    },
  });

  const searching = query.trim().length > 0;
  const sections = groupSavedFilters(filters ?? [], query);
  const isCollapsed = (group: string) => !searching && collapsedGroups.includes(group.toLocaleLowerCase());
  const visibleFilters = sections.flatMap((section) =>
    section.group != null && isCollapsed(section.group) ? [] : section.items.map((item) => item.filter),
  );
  const matchCount = sections.reduce((count, section) => count + section.items.length, 0);
  // While searching, the first match is highlighted so Enter applies it; arrow keys move from there. A highlighted
  // filter that is no longer listed falls back the same way.
  // A row being renamed is skipped, so Enter in the search cannot apply it and discard the unsaved name.
  const selectableFilters = visibleFilters.filter((filter) => filter.id !== renamingId);
  const activeIndex = activeId == null ? -1 : selectableFilters.findIndex((filter) => filter.id === activeId);
  const highlightedIndex = activeIndex >= 0 ? activeIndex : searching && selectableFilters.length > 0 ? 0 : -1;
  const highlightedId = highlightedIndex >= 0 ? selectableFilters[highlightedIndex].id : null;

  // Focus once the panel is visible (focus is refused while it is still hidden for measuring); skip touch devices,
  // where focusing would raise the on-screen keyboard over the list on every open.
  const panelVisible = open && panelPosition != null;
  useEffect(() => {
    if (panelVisible && !prefersTouch()) searchRef.current?.focus({ preventScroll: true });
  }, [panelVisible]);

  useEffect(() => {
    if (highlightedId == null) return;
    listRef.current?.querySelector(`[data-saved-filter-id="${highlightedId}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [highlightedId]);

  const toggleGroup = (group: string) => {
    const key = group.toLocaleLowerCase();
    const next = collapsedGroups.includes(key)
      ? collapsedGroups.filter((collapsed) => collapsed !== key)
      : [...collapsedGroups, key];
    setCollapsedGroups(next);
    writeCollapsedGroups(mode, next);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (selectableFilters.length === 0) return;
      const next =
        event.key === "ArrowDown"
          ? Math.min(highlightedIndex + 1, selectableFilters.length - 1)
          : Math.max(highlightedIndex - 1, 0);
      setActiveId(selectableFilters[next].id);
    } else if (event.key === "Enter" && highlightedIndex >= 0 && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const filter = selectableFilters[highlightedIndex];
      applyFilter(filter.findFilter, filter.objectFilter, filter.uiOptions);
    } else if (event.key === "Escape" && query && !event.nativeEvent.isComposing) {
      // Clear the search first; the next Escape reaches the document listener and closes the menu.
      event.stopPropagation();
      setQuery("");
      setActiveId(null);
    }
  };

  const normalizedRenameName = renameValue.trim();
  const hasDuplicateRename =
    !!normalizedRenameName &&
    !!filters?.some(
      (filter) =>
        filter.id !== renamingId && filter.name.trim().toLocaleLowerCase() === normalizedRenameName.toLocaleLowerCase(),
    );
  const startRename = (filter: SavedFilter) => {
    renameMut.reset();
    focusRenameInputRef.current = true;
    setRenamingId(filter.id);
    setRenameValue(filter.name);
  };
  // Ends a rename unless a newer one has started. Focus in the closing row (or already lost to the page body, as when
  // its save button was disabled mid-save) moves to the search box rather than dropping to the body on unmount.
  function finishRename(id: number) {
    const active = document.activeElement;
    if (
      !active ||
      active === document.body ||
      (active instanceof HTMLElement && active.closest(`[data-saved-filter-id="${id}"]`) != null)
    ) {
      searchRef.current?.focus({ preventScroll: true });
    }
    setRenamingId((current) => (current === id ? null : current));
  }
  const commitRename = (filter: SavedFilter) => {
    if (!normalizedRenameName || hasDuplicateRename || renameMut.isPending) return;
    if (normalizedRenameName === filter.name) {
      finishRename(filter.id);
      return;
    }
    renameMut.mutate({ id: filter.id, name: normalizedRenameName });
  };

  const applyFilter = (findFilterJson: string | undefined, objectFilterJson?: string, uiOptionsJson?: string) => {
    try {
      // Filters created through the API (such as CLI video ID worklists) may omit find options entirely; treat
      // them like an empty find filter so the mode's default sort applies and the object filter still loads.
      const parsed = normalizeSavedFindFilter(mode, JSON.parse(findFilterJson || "{}") as FindFilter);
      if (parsed) onApplyFilter(parsed);
    } catch {
      // ignore invalid JSON
    }

    if (onApplyObjectFilter) {
      try {
        onApplyObjectFilter(objectFilterJson ? (JSON.parse(objectFilterJson) as Record<string, unknown>) : {});
      } catch {
        onApplyObjectFilter({});
      }
    }

    if (onApplyUIOptions) {
      if (uiOptionsJson) {
        try {
          onApplyUIOptions(JSON.parse(uiOptionsJson) as SavedFilterUIOptions);
        } catch {
          // ignore invalid JSON
        }
      } else {
        // A filter saved without display options still lets pages reset their own custom options; display mode
        // and zoom level are left unchanged because nothing is supplied for them.
        onApplyUIOptions({});
      }
    }

    closeMenu();
  };
  const normalizedSaveName = saveName.trim().toLocaleLowerCase();
  const hasDuplicateName =
    !!normalizedSaveName && !!filters?.some((filter) => filter.name.trim().toLocaleLowerCase() === normalizedSaveName);

  const renderFilterRow = (f: SavedFilter, label: string, grouped: boolean) => {
    const rowClassName = `group flex items-center py-1.5 hover:bg-card/80 ${grouped ? "pl-6 pr-3" : "px-3"} ${
      f.id === highlightedId ? "bg-accent/10" : ""
    }`;

    if (f.id === renamingId) {
      return (
        <div key={f.id} data-saved-filter-id={f.id} className={grouped ? "pl-6 pr-3 py-1.5" : "px-3 py-1.5"}>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={renameValue}
              onChange={(e) => {
                setRenameValue(e.target.value);
                if (renameMut.isError) renameMut.reset();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) commitRename(f);
                else if (e.key === "Escape" && !e.nativeEvent.isComposing) {
                  e.stopPropagation();
                  finishRename(f.id);
                }
              }}
              aria-label={`New name for saved filter "${f.name}"`}
              className="min-w-0 flex-1 rounded border border-border bg-card/70 px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
              // Focused once when the rename starts, not on every mount: collapsing a group or clearing a search can
              // remount this row, and it must not pull focus back from wherever the user has moved it.
              ref={(input) => {
                if (input && focusRenameInputRef.current) {
                  focusRenameInputRef.current = false;
                  input.focus();
                }
              }}
            />
            <button
              type="button"
              onClick={() => commitRename(f)}
              disabled={!normalizedRenameName || hasDuplicateRename || renameMut.isPending}
              aria-label={`Save name for saved filter "${f.name}"`}
              className="shrink-0 rounded bg-accent px-2 py-1 text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {renameMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </button>
          </div>
          {hasDuplicateRename ? (
            <p className="mt-1 w-0 min-w-full text-[10px] text-red-400">
              A saved filter with this name already exists.
            </p>
          ) : renameMut.isError ? (
            <p role="alert" className="mt-1 w-0 min-w-full text-[10px] text-red-400">
              Could not rename this saved filter.
            </p>
          ) : (
            <p className="mt-1 w-0 min-w-full text-[10px] text-muted">
              Name it “Group{SAVED_FILTER_GROUP_SEPARATOR}Name” to file it under a group.
            </p>
          )}
        </div>
      );
    }

    return (
      <div key={f.id} data-saved-filter-id={f.id} className={rowClassName}>
        <SavedFilterName
          id={filterButtonId(f.id)}
          name={f.name}
          label={highlightMatch(label, query)}
          onClick={() => applyFilter(f.findFilter, f.objectFilter, f.uiOptions)}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            startRename(f);
          }}
          aria-label={`Rename saved filter "${f.name}"`}
          title="Rename"
          className="shrink-0 p-1 text-muted hover:text-accent transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateMut.reset();
            updateMut.mutate(f.id);
          }}
          disabled={updateMut.isPending}
          aria-label={`Update saved filter "${f.name}"`}
          title="Update with current filter"
          className="shrink-0 p-1 text-muted hover:text-accent transition-colors disabled:opacity-50"
        >
          {updateMut.isPending && updateMut.variables === f.id ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteMut.mutate(f.id);
          }}
          aria-label={`Delete saved filter "${f.name}"`}
          title="Delete saved filter"
          className="shrink-0 p-1 text-muted hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1 rounded-lg border border-border bg-card/70 px-2 py-1 text-xs text-secondary hover:border-accent hover:text-foreground"
        title="Saved filters"
      >
        <Bookmark className="w-3.5 h-3.5" />
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Saved filters"
          className="saved-filter-menu-panel styled-dropdown-panel fixed z-50 rounded-lg border border-border shadow-lg"
          style={{
            top: panelPosition?.top ?? 0,
            left: panelPosition?.left ?? 0,
            maxHeight: panelPosition?.maxHeight,
            maxWidth: panelPosition?.maxWidth,
            minWidth: panelPosition?.minWidth,
            overflowY: "auto",
            visibility: panelPosition ? "visible" : "hidden",
          }}
        >
          {/* The header doubles as the search: at rest its placeholder reads like the former "Saved Filters" label. */}
          <label className="flex items-center gap-1.5 border-b border-border p-2 transition-colors focus-within:border-accent">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveId(null);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Saved filters"
              aria-label="Search saved filters"
              aria-controls={listId}
              aria-activedescendant={highlightedId != null ? filterButtonId(highlightedId) : undefined}
              autoComplete="off"
              spellCheck={false}
              className="h-[15px] min-w-0 flex-1 bg-transparent text-xs leading-[15px] text-foreground outline-none placeholder:text-[10px] placeholder:font-medium placeholder:uppercase placeholder:tracking-wider placeholder:text-muted"
            />
            {searching ? (
              <span className="shrink-0 text-[10px] text-muted tabular-nums" aria-hidden="true">
                {matchCount}/{filters?.length ?? 0}
              </span>
            ) : (
              <Search className="h-3 w-3 shrink-0 text-muted opacity-60" aria-hidden="true" />
            )}
            {/* Always rendered so the first count after typing is announced too. */}
            <span className="sr-only" aria-live="polite">
              {searching ? `${matchCount} of ${filters?.length ?? 0} saved filters match` : ""}
            </span>
          </label>

          {/* Existing filters */}
          <div ref={listRef} id={listId} className="max-h-72 overflow-y-auto">
            {(!filters || filters.length === 0) && <p className="px-3 py-2 text-xs text-muted">No saved filters</p>}
            {searching && matchCount === 0 && !!filters?.length && (
              <p className="px-3 py-2 text-xs text-muted">No saved filters match</p>
            )}
            {sections.map((section) => {
              const collapsed = section.group != null && isCollapsed(section.group);
              return (
                <div
                  key={section.group ?? ""}
                  role={section.group != null ? "group" : undefined}
                  aria-label={section.group ?? undefined}
                  // Ungrouped filters follow the groups without a header; a rule keeps them from reading as the
                  // last group's members.
                  className={
                    section.group == null && sections.length > 1 ? "mt-1 border-t border-border/60" : undefined
                  }
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
                      <span className="min-w-0 truncate">{highlightMatch(section.group, query)}</span>
                      <span className="ml-auto pl-2 text-[10px] font-normal text-muted tabular-nums">
                        {section.items.length}
                      </span>
                    </button>
                  )}
                  {!collapsed &&
                    section.items.map(({ filter: f, label }) => renderFilterRow(f, label, section.group != null))}
                </div>
              );
            })}
            {updateMut.isError && (
              <p role="alert" className="px-3 py-1.5 text-[10px] text-red-400">
                Could not update this saved filter.
              </p>
            )}
          </div>

          {/* Save current */}
          <div className="border-t border-border p-2 space-y-1.5">
            {/* Set/clear default filter */}
            <button
              onClick={() => {
                setDefaultFilter(defaultKey, currentFilter, currentObjectFilter, currentUIOptions);
                closeMenu();
              }}
              className="flex items-center gap-1.5 text-xs text-secondary hover:text-yellow-400 w-full"
              title="Apply the current filter state automatically when opening this page"
            >
              <Star className="w-3 h-3" />
              Set current as default
            </button>
            {hasDefault && (
              <button
                onClick={() => {
                  clearDefaultFilter(defaultKey);
                  closeMenu();
                }}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-red-400 w-full"
              >
                <Star className="w-3 h-3" />
                Clear default filter
              </button>
            )}
            {showSave ? (
              <div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => {
                      setSaveName(e.target.value);
                      createMut.reset();
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      !e.nativeEvent.isComposing &&
                      normalizedSaveName &&
                      !hasDuplicateName &&
                      createMut.mutate()
                    }
                    placeholder="Filter name..."
                    className="flex-1 rounded border border-border bg-card/70 px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent placeholder:text-muted"
                    autoFocus
                  />
                  <button
                    onClick={() => normalizedSaveName && !hasDuplicateName && createMut.mutate()}
                    disabled={!normalizedSaveName || hasDuplicateName || createMut.isPending}
                    aria-label="Create saved filter"
                    className="px-2 py-1 rounded text-xs bg-accent text-white hover:bg-accent-hover disabled:opacity-60"
                  >
                    {createMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </button>
                </div>
                {hasDuplicateName && (
                  <p className="mt-1 w-0 min-w-full text-[10px] text-red-400">
                    A saved filter with this name already exists.
                  </p>
                )}
                {createMut.isError && (
                  <p role="alert" className="mt-1 w-0 min-w-full text-[10px] text-red-400">
                    Could not save this filter. Its name may already be in use.
                  </p>
                )}
                {!hasDuplicateName && !createMut.isError && (
                  <p className="mt-1 w-0 min-w-full text-[10px] text-muted">
                    Name it “Group{SAVED_FILTER_GROUP_SEPARATOR}Name” to file it under a group.
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSave(true)}
                className="flex items-center gap-1.5 text-xs text-secondary hover:text-foreground w-full"
              >
                <Save className="w-3 h-3" />
                Save current filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

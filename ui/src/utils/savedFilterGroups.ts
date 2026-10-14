/**
 * Saved filters are grouped in the menu by a naming convention rather than a stored field: a name of the form
 * `Group / Name` files the filter under "Group". Only a slash with a space on each side separates, so names such as
 * `1080p/4K` or `AC/DC` stay ungrouped, and the stored name (shown elsewhere, e.g. dashboards and the CLI) is unchanged.
 */
export const SAVED_FILTER_GROUP_SEPARATOR = " / ";

export interface SavedFilterNameParts {
  group: string | null;
  label: string;
}

/** Splits a saved-filter name on its first group separator; names without both a group and a label stay ungrouped. */
export function splitSavedFilterName(name: string): SavedFilterNameParts {
  const index = name.indexOf(SAVED_FILTER_GROUP_SEPARATOR);
  if (index < 0) return { group: null, label: name };
  const group = name.slice(0, index).trim();
  const label = name.slice(index + SAVED_FILTER_GROUP_SEPARATOR.length).trim();
  return group && label ? { group, label } : { group: null, label: name };
}

export interface SavedFilterSectionItem<T> {
  filter: T;
  label: string;
}

export interface SavedFilterSection<T> {
  /** Null for the ungrouped filters, which are listed after every group. */
  group: string | null;
  items: SavedFilterSectionItem<T>[];
}

/** Case-insensitive match against the whole name, so a query can hit either the group or the label. */
export function savedFilterMatches(name: string, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || name.toLocaleLowerCase().includes(normalized);
}

/**
 * Builds the menu sections: each group in name order, then the ungrouped filters. Filters keep their incoming order
 * within a section (the API sorts by name). Filters that do not match `query` are left out, and so are empty groups.
 */
export function groupSavedFilters<T extends { name: string }>(
  filters: readonly T[],
  query = "",
): SavedFilterSection<T>[] {
  const ungrouped: SavedFilterSectionItem<T>[] = [];
  const groups = new Map<string, { group: string; items: SavedFilterSectionItem<T>[] }>();

  for (const filter of filters) {
    const matches = savedFilterMatches(filter.name, query);
    const { group, label } = splitSavedFilterName(filter.name);
    if (group == null) {
      if (matches) ungrouped.push({ filter, label });
      continue;
    }
    // Groups differing only by case are one group, named as its first filter spells it. Non-matching filters still
    // register the group so a search does not change how its header is spelled.
    const key = group.toLocaleLowerCase();
    let section = groups.get(key);
    if (!section) {
      section = { group, items: [] };
      groups.set(key, section);
    }
    if (matches) section.items.push({ filter, label });
  }

  const sections: SavedFilterSection<T>[] = [...groups.values()]
    .filter((section) => section.items.length > 0)
    .sort((a, b) => a.group.localeCompare(b.group, undefined, { sensitivity: "base" }));
  if (ungrouped.length > 0) sections.push({ group: null, items: ungrouped });
  return sections;
}

// Which saved-filter groups are collapsed is a per-browser convenience, keyed by mode with lower-cased group names. The
// saved-filter menu and the import/export dialog share it, so a list's groups look the same in both.
function collapsedGroupsStorageKey(mode: string) {
  return `cove-saved-filter-collapsed-groups-${mode.trim().toLowerCase()}`;
}

export function readCollapsedSavedFilterGroups(mode: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(collapsedGroupsStorageKey(mode)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((group): group is string => typeof group === "string") : [];
  } catch {
    return [];
  }
}

export function writeCollapsedSavedFilterGroups(mode: string, groups: string[]) {
  try {
    if (groups.length > 0) localStorage.setItem(collapsedGroupsStorageKey(mode), JSON.stringify(groups));
    else localStorage.removeItem(collapsedGroupsStorageKey(mode));
  } catch {
    // Storage can be unavailable (private windows, blocked site data); groups then reset per page load.
  }
}

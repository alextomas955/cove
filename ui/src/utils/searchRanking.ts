export interface LabelledSearchOption {
  label: string;
  /** Favorites rank ahead of everything else, and only then by how well the label matches. */
  favorite?: boolean;
  /** Other names the option is known by; typing one exactly ranks it like an exact label match. */
  aliases?: string[];
}

export function rankSearchOptions<T extends LabelledSearchOption>(options: T[], searchText: string): T[] {
  const needle = normalizeSearchText(searchText);
  if (!needle) {
    return [...options];
  }

  return [...options].sort((left, right) => {
    const leftFavorite = left.favorite === true;
    const rightFavorite = right.favorite === true;
    if (leftFavorite !== rightFavorite) return leftFavorite ? -1 : 1;

    const leftLabel = normalizeSearchText(left.label);
    const rightLabel = normalizeSearchText(right.label);
    const leftRank = hasAlias(left, needle) ? 0 : getSearchRank(leftLabel, needle);
    const rightRank = hasAlias(right, needle) ? 0 : getSearchRank(rightLabel, needle);

    if (leftRank !== rightRank) return leftRank - rightRank;
    if (leftLabel.length !== rightLabel.length) return leftLabel.length - rightLabel.length;
    return leftLabel.localeCompare(rightLabel);
  });
}

export function rankByLabel<T>(
  items: T[],
  searchText: string,
  getLabel: (item: T) => string,
  isFavorite?: (item: T) => boolean,
): T[] {
  return rankSearchOptions(
    items.map((item) => ({ item, label: getLabel(item), favorite: isFavorite?.(item) === true })),
    searchText,
  ).map((entry) => entry.item);
}

function hasAlias(option: LabelledSearchOption, needle: string) {
  return (option.aliases ?? []).some((alias) => normalizeSearchText(alias) === needle);
}

function getSearchRank(label: string, needle: string) {
  if (label === needle) return 0;
  if (label.startsWith(needle)) return 1;
  const wordIndex = label.search(new RegExp(`(^|\\s)${escapeRegExp(needle)}`));
  if (wordIndex >= 0) return 2;
  if (label.includes(needle)) return 3;
  return 4;
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

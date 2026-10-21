/**
 * Normalizes a folder path for comparison: trims, converts `\` to `/` and drops trailing separators,
 * keeping a filesystem root (`/` or a drive root such as `C:/`) intact.
 */
export function normalizeFolderPath(value: string) {
  let normalized = value.trim().replaceAll("\\", "/");
  while (normalized.length > 1 && normalized.endsWith("/") && !(normalized.length === 3 && normalized[1] === ":")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * True when `descendant` lies strictly beneath `ancestor` (a folder is not its own ancestor).
 * Matches whole path segments, so `/media/a` is not an ancestor of `/media/ab`.
 */
export function isFolderAncestorOf(ancestor: string, descendant: string, caseSensitive = true) {
  const parent = normalizeFolderPath(caseSensitive ? ancestor : ancestor.toLowerCase());
  const child = normalizeFolderPath(caseSensitive ? descendant : descendant.toLowerCase());
  if (parent.length === 0 || child === parent) return false;
  const prefix = parent.endsWith("/") ? parent : `${parent}/`;
  return child.startsWith(prefix);
}

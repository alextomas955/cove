const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Orders user-visible text the way the backend's natural collation does: "2" before "10", case ignored. */
export function compareNatural(left: string, right: string): number {
  return naturalCollator.compare(left, right);
}

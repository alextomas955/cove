// Editors save through full-object update payloads, but the update endpoints leave every omitted field
// unchanged. Sending only what the user changed keeps an editor opened on an older copy of an entity
// from reverting changes made elsewhere (another tab, another editor, a scraper) to fields it never
// touched.

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
    return [...keys].every((key) => valuesEqual(leftRecord[key], rightRecord[key]));
  }
  return false;
}

/**
 * The fields of `current` that differ from `baseline`, where `baseline` is the payload the editor would
 * have sent for the entity as it was loaded. `clearFields` keeps only the fields newly cleared.
 */
export function changedUpdateFields<T extends object>(baseline: T, current: T): Partial<T> {
  const changed: Record<string, unknown> = {};
  const baselineRecord = baseline as Record<string, unknown>;
  const currentRecord = current as Record<string, unknown>;
  for (const key of Object.keys(currentRecord)) {
    if (key === "clearFields") continue;
    if (!valuesEqual(currentRecord[key], baselineRecord[key])) changed[key] = currentRecord[key];
  }
  const alreadyCleared = new Set((baselineRecord.clearFields as string[] | undefined) ?? []);
  const newlyCleared = ((currentRecord.clearFields as string[] | undefined) ?? []).filter(
    (field) => !alreadyCleared.has(field),
  );
  if (newlyCleared.length > 0) changed.clearFields = newlyCleared;
  return changed as Partial<T>;
}

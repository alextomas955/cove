// The performer genders a tagging run can be filtered down to, and the comparison rules the backend's
// MetadataServerService applies to them. Both live here because the labels below are a wire contract:
// they are sent as-is and normalized on the other side, so a second copy of the list would drift.

// "Unknown" covers a remote performer whose metadata server states no gender. It is a real option rather
// than an implicit extra, because the backend excludes an unstated gender as soon as any filter is sent.
export const PERFORMER_GENDER_OPTIONS: readonly string[] = [
  "Female",
  "Male",
  "Transgender Female",
  "Transgender Male",
  "Intersex",
  "Non-Binary",
  "Unknown",
];

// Matches the backend's NormalizeGenderKey, so "Transgender Female" and TRANSGENDER_FEMALE compare equal.
export function normalizeGenderKey(value: string | undefined | null) {
  return (value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

const UNKNOWN_GENDER_KEY = normalizeGenderKey("Unknown");

// The allowed gender keys, or null when every option is checked and nothing is filtered. An empty
// selection stays an empty set, never null: it means "no gender allowed", which is what the request
// sends and what the backend applies to a list that is present but empty.
export function buildAllowedGenderKeys(performerGenders: string[]): Set<string> | null {
  const keys = new Set(performerGenders.map(normalizeGenderKey).filter((key) => key.length > 0));
  return PERFORMER_GENDER_OPTIONS.every((option) => keys.has(normalizeGenderKey(option))) ? null : keys;
}

// Mirrors the backend's IsPerformerGenderAllowed: an unstated gender counts as "Unknown".
export function isPerformerGenderAllowed(gender: string | undefined | null, allowed: Set<string> | null) {
  if (allowed == null) return true;
  const key = normalizeGenderKey(gender);
  return allowed.has(key.length > 0 ? key : UNKNOWN_GENDER_KEY);
}

// Whether a gender option's box is checked, compared by key so a config holding a variant spelling
// ("FEMALE", "Non Binary") shows the same state the filter and the request act on.
export function isGenderOptionChecked(performerGenders: string[], option: string) {
  const key = normalizeGenderKey(option);
  return performerGenders.some((gender) => normalizeGenderKey(gender) === key);
}

// Checking or unchecking one option. Unchecking removes every spelling of it, so the box cannot come
// back checked from a variant the toggle left behind.
export function toggleGenderOption(performerGenders: string[], option: string, checked: boolean) {
  const remaining = performerGenders.filter((gender) => normalizeGenderKey(gender) !== normalizeGenderKey(option));
  return checked ? [...remaining, option] : remaining;
}

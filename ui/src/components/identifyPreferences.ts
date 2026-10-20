import { PERFORMER_GENDER_OPTIONS, normalizeGenderKey } from "../utils/performerGenders";

// The Identify dialog's last-used sources and options, kept per browser so it reopens the way it was last
// run instead of with every source switched on (#703).

export const IDENTIFY_PREFERENCES_STORAGE_KEY = "cove.identify.preferences";

export interface IdentifySource {
  // Stable across restarts and reordering: a metadata server's endpoint or a scraper's id, never a list index.
  id: string;
  name: string;
  type: "metadata-server" | "scraper";
  enabled: boolean;
}

export type FieldStrategy = "ignore" | "merge" | "overwrite";

const FIELD_STRATEGIES: readonly FieldStrategy[] = ["ignore", "merge", "overwrite"];

export interface IdentifyPreferences {
  // In the user's order. Sources missing from this list were added after the last run.
  sources: { id: string; enabled: boolean }[];
  setCoverImage: boolean;
  markOrganized: boolean;
  skipMultipleMatches: boolean;
  skipSingleNamePerformers: boolean;
  // Unset until a run has been made, so the server's Identify Defaults apply until then.
  createTags?: boolean;
  createPerformers?: boolean;
  createStudios?: boolean;
  fieldStrategies: Record<string, FieldStrategy>;
  performerGenders: string[];
}

export const DEFAULT_IDENTIFY_PREFERENCES: IdentifyPreferences = {
  sources: [],
  setCoverImage: true,
  markOrganized: false,
  // Applying the top candidate of several is a guess; skipping leaves the video for the tagger instead.
  skipMultipleMatches: true,
  skipSingleNamePerformers: true,
  fieldStrategies: {},
  performerGenders: [...PERFORMER_GENDER_OPTIONS],
};

const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const optionalBool = (value: unknown) => (typeof value === "boolean" ? value : undefined);

/**
 * Restores the last-used choices, keeping only well-formed values. A stored value can outlive the build
 * that wrote it, so anything unrecognised falls back to the default rather than reaching the request.
 */
export function loadIdentifyPreferences(): IdentifyPreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(IDENTIFY_PREFERENCES_STORAGE_KEY) ?? "null") as Record<
      string,
      unknown
    > | null;
    if (!stored || typeof stored !== "object") return DEFAULT_IDENTIFY_PREFERENCES;

    const sources = Array.isArray(stored.sources)
      ? stored.sources.flatMap((source: unknown) => {
          const entry = source as { id?: unknown; enabled?: unknown } | null;
          return entry && typeof entry.id === "string" && typeof entry.enabled === "boolean"
            ? [{ id: entry.id, enabled: entry.enabled }]
            : [];
        })
      : [];

    const fieldStrategies: Record<string, FieldStrategy> = {};
    if (stored.fieldStrategies && typeof stored.fieldStrategies === "object") {
      for (const [key, value] of Object.entries(stored.fieldStrategies)) {
        if (FIELD_STRATEGIES.includes(value as FieldStrategy)) fieldStrategies[key] = value as FieldStrategy;
      }
    }

    const knownGenderKeys = new Set(PERFORMER_GENDER_OPTIONS.map(normalizeGenderKey));
    const performerGenders = Array.isArray(stored.performerGenders)
      ? stored.performerGenders.filter(
          (gender: unknown): gender is string =>
            typeof gender === "string" && knownGenderKeys.has(normalizeGenderKey(gender)),
        )
      : DEFAULT_IDENTIFY_PREFERENCES.performerGenders;

    return {
      sources,
      setCoverImage: bool(stored.setCoverImage, DEFAULT_IDENTIFY_PREFERENCES.setCoverImage),
      markOrganized: bool(stored.markOrganized, DEFAULT_IDENTIFY_PREFERENCES.markOrganized),
      skipMultipleMatches: bool(stored.skipMultipleMatches, DEFAULT_IDENTIFY_PREFERENCES.skipMultipleMatches),
      skipSingleNamePerformers: bool(
        stored.skipSingleNamePerformers,
        DEFAULT_IDENTIFY_PREFERENCES.skipSingleNamePerformers,
      ),
      createTags: optionalBool(stored.createTags),
      createPerformers: optionalBool(stored.createPerformers),
      createStudios: optionalBool(stored.createStudios),
      fieldStrategies,
      performerGenders,
    };
  } catch {
    return DEFAULT_IDENTIFY_PREFERENCES;
  }
}

export function saveIdentifyPreferences(preferences: IdentifyPreferences) {
  try {
    localStorage.setItem(IDENTIFY_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Remembering the choices is a convenience only.
  }
}

/**
 * Lays the saved order and on/off state over the sources available now. Saved sources that no longer
 * exist are dropped; sources the user has never seen are appended switched off, because the issue asks for
 * sources to be opt-in, and a run should not start using a newly added scraper unasked.
 */
export function applySavedSources(
  available: IdentifySource[],
  saved: IdentifyPreferences["sources"],
): IdentifySource[] {
  const byId = new Map(available.map((source) => [source.id, source]));
  const ordered: IdentifySource[] = [];
  for (const entry of saved) {
    const source = byId.get(entry.id);
    if (!source) continue;
    ordered.push({ ...source, enabled: entry.enabled });
    byId.delete(entry.id);
  }
  for (const source of byId.values()) ordered.push({ ...source, enabled: false });
  return ordered;
}

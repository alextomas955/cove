const ACRONYMS: ReadonlySet<string> = new Set(["ai", "api", "id", "ml", "ocr"]);

/**
 * Readable name for a provenance source key: an extension key loses its `ext:` prefix and is title-cased word by
 * word, so `ext:ai.core` reads "AI Core". Other keys are shown as stored.
 */
export function formatSourceKeyLabel(sourceKey?: string | null): string {
  if (!sourceKey) return "Unknown source";
  if (sourceKey === "user") return "User";
  if (!sourceKey.startsWith("ext:")) return sourceKey;
  return sourceKey
    .slice(4)
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) =>
      ACRONYMS.has(part.toLowerCase()) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}

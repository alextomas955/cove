import type { ReactNode } from "react";

/** Marks the first case-insensitive occurrence of a saved-filter search in a name or group label. */
export function highlightSavedFilterMatch(text: string, query: string): ReactNode {
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

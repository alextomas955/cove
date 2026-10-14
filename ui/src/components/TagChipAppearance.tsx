import type { CSSProperties } from "react";

// The group dot and tint a tag chip wears, shared by TagBadge and the selectors' chips so a tag looks the
// same in the Details tab and the Edit tab. A group without a color still gets a neutral dot, so its name
// stays reachable.
export function TagGroupMarker({ color, name }: { color?: string | null; name?: string | null }) {
  const resolvedColor = normalizeTagColor(color);
  const resolvedName = name?.trim();
  if (!resolvedColor && !resolvedName) return null;
  return (
    <span
      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-current/30"
      title={resolvedName ? `Tag group: ${resolvedName}` : "Tag group"}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full${resolvedColor ? "" : " bg-muted"}`}
        style={resolvedColor ? { backgroundColor: resolvedColor } : undefined}
      />
    </span>
  );
}

export function getTagChipColorStyle(color?: string | null): CSSProperties | undefined {
  const resolvedColor = normalizeTagColor(color);
  return resolvedColor ? getTagColorStyle(resolvedColor) : undefined;
}

export function normalizeTagColor(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed || !/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function getTagColorStyle(color: string): CSSProperties {
  return {
    borderColor: hexToRgba(color, 0.58),
    backgroundColor: hexToRgba(color, 0.14),
    color: hexToRgba(color, 0.96),
  };
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.slice(1, 7);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

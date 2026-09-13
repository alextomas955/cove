import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Columns3, X } from "lucide-react";
import {
  DEFAULT_VIDEO_LIST_COLUMN_IDS,
  VIDEO_LIST_COLUMNS,
  VIDEO_LIST_COLUMN_BY_ID,
  hasVideoListColumnWidths,
  isDefaultVideoListColumns,
  type VideoListColumnId,
  type VideoListColumnWidths,
} from "./videoListColumns";

interface Props {
  columnIds: readonly VideoListColumnId[];
  onChange: (next: VideoListColumnId[]) => void;
  /** User-resized widths; "Reset to defaults" clears them together with the column list. */
  columnWidths?: VideoListColumnWidths;
  onColumnWidthsChange?: (next: VideoListColumnWidths) => void;
}

const triggerClass =
  "inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-border bg-card/70 px-2.5 py-2 text-sm text-secondary transition-colors hover:border-accent/50 hover:text-accent sm:min-h-0 sm:py-1 sm:text-xs";
const reorderButtonClass =
  "inline-flex min-h-6 min-w-6 items-center justify-center text-muted hover:text-foreground disabled:opacity-30";

export function VideoListColumnPicker({ columnIds, onChange, columnWidths, onColumnWidthsChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const visible = columnIds.filter((id) => VIDEO_LIST_COLUMN_BY_ID.has(id));
  const hidden = VIDEO_LIST_COLUMNS.filter((column) => !visible.includes(column.id));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= visible.length) return;
    const next = [...visible];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`${triggerClass} ${open ? "border-accent/50 text-accent" : ""}`}
        title="Columns"
        aria-label="Columns"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Columns3 className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="List columns"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-border bg-surface p-3 shadow-2xl shadow-black/50"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">List columns</h2>
            <button type="button" onClick={() => setOpen(false)} className={reorderButtonClass} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto">
            {visible.map((id, index) => {
              const column = VIDEO_LIST_COLUMN_BY_ID.get(id)!;
              return (
                <li key={id} className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-card/60">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked
                      // The title carries the row's keyboard action, so it always stays visible.
                      disabled={visible.length === 1 || id === "title"}
                      onChange={() => onChange(visible.filter((other) => other !== id))}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-accent"
                    />
                    <span className="truncate">{column.label}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className={reorderButtonClass}
                    aria-label={`Move ${column.label} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === visible.length - 1}
                    className={reorderButtonClass}
                    aria-label={`Move ${column.label} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
            {hidden.length > 0 && visible.length > 0 && (
              <li aria-hidden="true" className="my-1 border-t border-border/70" />
            )}
            {hidden.map((column) => (
              <li key={column.id} className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-card/60">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onChange([...visible, column.id])}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-accent"
                  />
                  <span className="truncate">{column.label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex justify-end border-t border-border/70 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange([...DEFAULT_VIDEO_LIST_COLUMN_IDS]);
                onColumnWidthsChange?.({});
              }}
              disabled={isDefaultVideoListColumns(visible) && !hasVideoListColumnWidths(columnWidths ?? {})}
              className="text-xs text-secondary hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

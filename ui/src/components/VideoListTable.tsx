import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Layers } from "lucide-react";
import type { EntityEngagement, Group, VideoListEntry } from "../api/types";
import { toggleOptionsFromEvent, type MultiSelectToggleHandler } from "../hooks/useMultiSelect";
import { useListPageCardSizeContext } from "./ListPageCardSizeContext";
import {
  clampVideoListColumnWidth,
  DEFAULT_VIDEO_LIST_COLUMN_IDS,
  getVideoListTitle,
  VIDEO_LIST_CELL_PADDING_PX,
  VIDEO_LIST_COLUMN_BY_ID,
  VIDEO_LIST_FLUID_COLUMN_MIN_WIDTH_PX,
  VIDEO_LIST_SELECTION_COLUMN_WIDTH_PX,
  type VideoListCellContext,
  type VideoListColumnDefinition,
  type VideoListColumnId,
  type VideoListColumnWidths,
} from "./videoListColumns";

const MIN_THUMBNAIL_HEIGHT_PX = 40;
const MAX_THUMBNAIL_HEIGHT_PX = 120;

export interface VideoListTableProps {
  entries: VideoListEntry[];
  columnIds: readonly VideoListColumnId[];
  /** User-resized widths; a column without an entry uses its built-in fixed width or stays fluid. */
  columnWidths?: VideoListColumnWidths;
  /** Enables the header drag handles. Called once per finished drag with the complete width map. */
  onColumnWidthsChange?: (next: VideoListColumnWidths) => void;
  engagementById: ReadonlyMap<number, EntityEngagement>;
  onNavigate: (route: any) => void;
  selectedIds?: Set<number>;
  onToggle?: MultiSelectToggleHandler;
  /** Selects or clears every visible video at once; used by the header checkbox. */
  onSelectVisible?: (ids: number[], selected: boolean) => void;
  selecting?: boolean;
}

export function resolveVideoListColumnDefinitions(columnIds: readonly VideoListColumnId[]) {
  const columns = columnIds
    .map((id) => VIDEO_LIST_COLUMN_BY_ID.get(id))
    .filter((column): column is VideoListColumnDefinition => column != null);
  if (columns.length > 0) return columns;
  return DEFAULT_VIDEO_LIST_COLUMN_IDS.map((id) => VIDEO_LIST_COLUMN_BY_ID.get(id)!);
}

export function getVideoListThumbnailHeightPx(zoomLevel: number | undefined) {
  const level = typeof zoomLevel === "number" && Number.isFinite(zoomLevel) ? zoomLevel : 1;
  return Math.min(MAX_THUMBNAIL_HEIGHT_PX, Math.max(MIN_THUMBNAIL_HEIGHT_PX, Math.round(48 + level * 24)));
}

/** Pixel width for a column, or `undefined` for a fluid column that shares the remaining table width. */
export function getVideoListColumnWidthPx(
  column: VideoListColumnDefinition,
  thumbnailHeightPx: number,
  columnWidths: VideoListColumnWidths = {},
) {
  const userWidth = columnWidths[column.id];
  if (userWidth != null) return userWidth;
  if (column.id === "thumbnail") return Math.round((thumbnailHeightPx * 16) / 9) + VIDEO_LIST_CELL_PADDING_PX;
  return column.widthPx;
}

/**
 * The table uses `table-layout: fixed` so fluid columns split the leftover width evenly. This minimum keeps every
 * fluid column readable; below it the wrapper scrolls horizontally instead of crushing the columns.
 */
export function getVideoListTableMinWidthPx(
  columns: readonly VideoListColumnDefinition[],
  thumbnailHeightPx: number,
  showSelection: boolean,
  columnWidths: VideoListColumnWidths = {},
) {
  const columnsWidth = columns.reduce(
    (total, column) =>
      total +
      (getVideoListColumnWidthPx(column, thumbnailHeightPx, columnWidths) ?? VIDEO_LIST_FLUID_COLUMN_MIN_WIDTH_PX),
    0,
  );
  return columnsWidth + (showSelection ? VIDEO_LIST_SELECTION_COLUMN_WIDTH_PX : 0);
}

function alignmentClass(align: VideoListColumnDefinition["align"]) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

interface ResizeDrag {
  columnId: VideoListColumnId;
  pointerId: number;
  startX: number;
  startWidth: number;
}

export function VideoListTable({
  entries,
  columnIds,
  columnWidths,
  onColumnWidthsChange,
  engagementById,
  onNavigate,
  selectedIds,
  onToggle,
  onSelectVisible,
  selecting,
}: VideoListTableProps) {
  const columns = useMemo(() => resolveVideoListColumnDefinitions(columnIds), [columnIds]);
  const zoomLevel = useListPageCardSizeContext()?.zoomLevel;
  const thumbnailHeightPx = getVideoListThumbnailHeightPx(zoomLevel);
  const cellContext = useMemo<VideoListCellContext>(
    () => ({ onNavigate, thumbnailHeightPx }),
    [onNavigate, thumbnailHeightPx],
  );
  const videoIds = useMemo(() => entries.flatMap((entry) => (entry.video ? [entry.video.id] : [])), [entries]);
  const showSelection = Boolean(onToggle);
  const selectedVisibleCount = selectedIds ? videoIds.filter((id) => selectedIds.has(id)).length : 0;
  const allVisibleSelected = videoIds.length > 0 && selectedVisibleCount === videoIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);
  // Widths follow the pointer during a drag and are committed to the parent once on release.
  const [draftWidths, setDraftWidths] = useState<VideoListColumnWidths | null>(null);
  const dragRef = useRef<ResizeDrag | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const effectiveWidths = draftWidths ?? columnWidths ?? {};

  // Unmounting mid-drag (switching display mode, navigating away) must not leave window listeners behind.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  if (entries.length === 0) return null;

  const resizable = Boolean(onColumnWidthsChange);
  const hasFluidColumn = columns.some(
    (column) => getVideoListColumnWidthPx(column, thumbnailHeightPx, effectiveWidths) == null,
  );
  // With every column fixed, a trailing filler absorbs the leftover width so user widths stay exact.
  const showFiller = !hasFluidColumn;
  const columnCount = columns.length + (showSelection ? 1 : 0) + (showFiller ? 1 : 0);
  const tableStyle: CSSProperties = {
    tableLayout: "fixed",
    minWidth: getVideoListTableMinWidthPx(columns, thumbnailHeightPx, showSelection, effectiveWidths),
  };

  // Pointer capture keeps the drag alive when the pointer leaves the window; the window listeners are the
  // fallback for environments without capture, and a button-less move or a focus loss ends the drag defensively.
  const startResize = (event: ReactPointerEvent<HTMLDivElement>, column: VideoListColumnDefinition) => {
    if (event.button !== 0 || dragRef.current) return;
    const header = event.currentTarget.parentElement;
    const startWidth = clampVideoListColumnWidth(
      getVideoListColumnWidthPx(column, thumbnailHeightPx, effectiveWidths) ??
        header?.getBoundingClientRect().width ??
        VIDEO_LIST_FLUID_COLUMN_MIN_WIDTH_PX,
    );
    const drag: ResizeDrag = { columnId: column.id, pointerId: event.pointerId, startX: event.clientX, startWidth };
    const baseWidths = columnWidths ?? {};
    const widthAt = (clientX: number) => clampVideoListColumnWidth(startWidth + (clientX - drag.startX));
    let moved = false;
    const finish = (clientX: number | null) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      window.removeEventListener("blur", onBlur);
      dragRef.current = null;
      dragCleanupRef.current = null;
      setDraftWidths(null);
      // A click without movement (including the two clicks of a double-click reset) does not commit a width.
      if (clientX != null && moved) onColumnWidthsChange?.({ ...baseWidths, [drag.columnId]: widthAt(clientX) });
    };
    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== drag.pointerId) return;
      if (moveEvent.buttons === 0) {
        finish(moved ? moveEvent.clientX : null);
        return;
      }
      moved = true;
      setDraftWidths({ ...baseWidths, [drag.columnId]: widthAt(moveEvent.clientX) });
    };
    const onEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== drag.pointerId) return;
      finish(endEvent.clientX);
    };
    const onBlur = () => finish(null);
    dragRef.current = drag;
    dragCleanupRef.current = () => finish(null);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; the window listeners still track the drag.
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("blur", onBlur);
    setDraftWidths({ ...baseWidths, [column.id]: startWidth });
    event.preventDefault();
    event.stopPropagation();
  };

  const resetResize = (column: VideoListColumnDefinition) => {
    if (!columnWidths || columnWidths[column.id] == null) return;
    const next = { ...columnWidths };
    delete next[column.id];
    onColumnWidthsChange?.(next);
  };

  return (
    <div className="w-full px-1">
      <div className="overflow-x-auto rounded-lg border border-border bg-card/40">
        <table className="w-full border-collapse text-sm" style={tableStyle} aria-label="Videos">
          <thead className="bg-card text-[11px] uppercase tracking-wide text-muted">
            <tr className="border-b border-border">
              {showSelection && (
                <th scope="col" className="px-3 py-2" style={{ width: VIDEO_LIST_SELECTION_COLUMN_WIDTH_PX }}>
                  {onSelectVisible && (
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => onSelectVisible(videoIds, !allVisibleSelected)}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-accent"
                      aria-label="Select all visible"
                    />
                  )}
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`relative px-3 py-2 font-semibold ${alignmentClass(column.align)}`}
                  style={{ width: getVideoListColumnWidthPx(column, thumbnailHeightPx, effectiveWidths) }}
                >
                  {column.id === "thumbnail" ? <span className="sr-only">{column.label}</span> : column.label}
                  {resizable && (
                    <div
                      aria-hidden="true"
                      title={`Resize ${column.label} column: drag to resize, double-click to reset`}
                      data-resize-handle={column.id}
                      onPointerDown={(event) => startResize(event, column)}
                      onDoubleClick={() => resetResize(column)}
                      onClick={(event) => event.stopPropagation()}
                      className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none select-none after:absolute after:inset-y-1.5 after:left-1/2 after:w-px after:bg-border/80 after:content-[''] hover:after:bg-accent"
                    />
                  )}
                </th>
              ))}
              {showFiller && <th scope="col" aria-hidden="true" className="p-0" />}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              if (entry.kind === "compilation" && entry.group) {
                return (
                  <CompilationRow
                    key={`compilation-${entry.group.id}`}
                    group={entry.group}
                    columnCount={columnCount}
                    onNavigate={onNavigate}
                  />
                );
              }
              const video = entry.video;
              if (!video) return null;
              const selected = selectedIds?.has(video.id) ?? false;
              const engagement = engagementById.get(video.id);
              return (
                <tr
                  key={`video-${video.id}`}
                  data-video-id={video.id}
                  aria-selected={showSelection ? selected : undefined}
                  onClick={(event) =>
                    selecting
                      ? onToggle?.(video.id, toggleOptionsFromEvent(event, videoIds))
                      : onNavigate({ page: "video", id: video.id })
                  }
                  className={`cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-card ${
                    selected ? "bg-accent/10" : ""
                  }`}
                >
                  {showSelection && (
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggle?.(video.id, toggleOptionsFromEvent(event, videoIds));
                        }}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-border accent-accent"
                        aria-label={`Select ${getVideoListTitle(video)}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={`overflow-hidden px-3 py-2 align-middle ${alignmentClass(column.align)} ${column.cellClassName ?? ""}`}
                    >
                      {column.render(video, engagement, cellContext)}
                    </td>
                  ))}
                  {showFiller && <td aria-hidden="true" className="p-0" />}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompilationRow({
  group,
  columnCount,
  onNavigate,
}: {
  group: Group;
  columnCount: number;
  onNavigate: (route: any) => void;
}) {
  return (
    <tr
      data-compilation-id={group.id}
      onClick={() => onNavigate({ page: "compilation", id: group.id })}
      className="cursor-pointer border-b border-border/60 bg-surface/40 transition-colors last:border-b-0 hover:bg-card"
    >
      <td colSpan={columnCount} className="px-3 py-2 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-surface/80 text-muted">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNavigate({ page: "compilation", id: group.id });
              }}
              className="min-w-0 truncate text-left font-medium text-foreground transition-colors hover:text-accent"
            >
              {group.name}
            </button>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
              Compilation
            </span>
            <span className="truncate text-xs text-secondary">
              {[group.studioName, group.date].filter(Boolean).join(" · ")}
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted">{group.videoCount} videos</span>
        </div>
      </td>
    </tr>
  );
}

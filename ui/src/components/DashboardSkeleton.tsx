import { Plus, Settings2 } from "lucide-react";
import type { CSSProperties } from "react";
import { getEntityCardMinWidthPx } from "../hooks/useEntityCardSize";

/**
 * The outer dimensions of a dashboard recommendation card. Real cards and their loading skeletons
 * share these, so a row keeps its height when data replaces the skeleton.
 */
export interface RecommendationCardShape {
  /** Width class; the row sets `--dashboard-card-width` from the widget's card size. */
  width: string;
  /** Aspect ratio of the cover image box. */
  media: string;
  /** Minimum height of the text block under the cover; it reserves an optional secondary line. */
  body: string;
  /** Whether the card ends with a stats row. */
  stats: boolean;
}

// py-1.5 plus a text-sm title line, and for two lines a text-xs secondary line.
const ONE_LINE_BODY = "min-h-[2rem]";
const TWO_LINE_BODY = "min-h-[3rem]";

/** pb-1.5 plus one text-xs line. */
export const RECOMMENDATION_CARD_STATS_ROW = "min-h-[1.375rem]";

/** Every card reads its width from the row so a widget's card size applies to real cards and skeletons alike. */
export const RECOMMENDATION_CARD_WIDTH_CLASS = "w-[var(--dashboard-card-width)]";

const W = RECOMMENDATION_CARD_WIDTH_CLASS;

/** Skeleton shapes approximating the shared entity tiles that replace them. */
export const RECOMMENDATION_CARD_SHAPES = {
  video: { width: W, media: "aspect-video", body: TWO_LINE_BODY, stats: true },
  performer: { width: W, media: "aspect-[2/3]", body: TWO_LINE_BODY, stats: false },
  studio: { width: W, media: "aspect-video", body: ONE_LINE_BODY, stats: false },
  tag: { width: W, media: "aspect-video", body: ONE_LINE_BODY, stats: false },
  gallery: { width: W, media: "aspect-video", body: TWO_LINE_BODY, stats: false },
  group: { width: W, media: "aspect-[2/3]", body: TWO_LINE_BODY, stats: false },
  audio: { width: W, media: "aspect-video", body: TWO_LINE_BODY, stats: false },
  text: { width: W, media: "aspect-video", body: TWO_LINE_BODY, stats: false },
  segment: { width: W, media: "aspect-video", body: TWO_LINE_BODY, stats: false },
  groupItem: { width: W, media: "aspect-video", body: ONE_LINE_BODY, stats: false },
} satisfies Record<string, RecommendationCardShape>;

/** Card size levels match the list pages' card size slider; level 1 is the historical card width. */
export const MIN_DASHBOARD_CARD_SIZE = 0;
export const MAX_DASHBOARD_CARD_SIZE = 8;
export const DEFAULT_DASHBOARD_CARD_SIZE = 1;
export const MIN_DASHBOARD_ROWS = 1;
export const MAX_DASHBOARD_ROWS = 20;
export const MIN_DASHBOARD_PAGES = 1;
export const MAX_DASHBOARD_PAGES = 20;

export function clampDashboardCardSize(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_DASHBOARD_CARD_SIZE;
  return Math.min(MAX_DASHBOARD_CARD_SIZE, Math.max(MIN_DASHBOARD_CARD_SIZE, Math.round(value)));
}

/** A page limit, or undefined when the widget shows every item it loads. */
export function clampDashboardPages(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(MAX_DASHBOARD_PAGES, Math.max(MIN_DASHBOARD_PAGES, Math.round(value)));
}

export function clampDashboardRows(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return MIN_DASHBOARD_ROWS;
  return Math.min(MAX_DASHBOARD_ROWS, Math.max(MIN_DASHBOARD_ROWS, Math.round(value)));
}

/** Dashboard cards use the same size scale as every list page, so level N is the same width everywhere. */
export function dashboardCardWidthPx(cardSize: number) {
  return getEntityCardMinWidthPx(undefined, clampDashboardCardSize(cardSize));
}

/** Inline style for the element that hosts a row's cards. */
export function dashboardCardWidthStyle(cardWidthPx: number) {
  return { "--dashboard-card-width": `${cardWidthPx}px` } as CSSProperties;
}

/** The horizontal gap between cards (gap-2) and the track's total horizontal padding (px-1). */
const CARD_GAP_PX = 8;
const TRACK_PADDING_PX = 8;

function fittedCardWidthPx(trackWidthPx: number, columns: number) {
  return Math.floor((trackWidthPx - TRACK_PADDING_PX - CARD_GAP_PX * (columns - 1)) / columns);
}

/**
 * Fits whole card columns across a row's track: the column count whose fitted card width is closest
 * to the requested width, with the cards stretched so they fill the track exactly. Before the track
 * is measured the requested width stands in.
 */
export function fitDashboardCards(trackWidthPx: number, requestedCardWidthPx: number) {
  if (trackWidthPx <= 0) return { columns: 1, cardWidthPx: requestedCardWidthPx };
  const columns = Math.max(
    1,
    Math.floor((trackWidthPx - TRACK_PADDING_PX + CARD_GAP_PX) / (requestedCardWidthPx + CARD_GAP_PX)),
  );
  const candidates = [columns, columns + 1]
    .map((count) => ({ columns: count, cardWidthPx: fittedCardWidthPx(trackWidthPx, count) }))
    .filter((candidate) => candidate.cardWidthPx > 0);
  if (candidates.length === 0) return { columns: 1, cardWidthPx: requestedCardWidthPx };
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate.cardWidthPx - requestedCardWidthPx) < Math.abs(best.cardWidthPx - requestedCardWidthPx)
      ? candidate
      : best,
  );
}

/** A multi-row widget shows one page of whole columns at a time instead of scrolling sideways. */
export function dashboardPagedTrackStyle(rows: number): CSSProperties {
  return {
    display: "grid",
    gridAutoFlow: "column",
    gridTemplateRows: `repeat(${clampDashboardRows(rows)}, auto)`,
    gridAutoColumns: "max-content",
  };
}

/** Enough placeholders per row to overflow a wide row, so its carousel page dots appear while loading too. */
const SKELETON_CARDS_PER_ROW = 10;

const PULSE = "motion-safe:animate-pulse";

export function RecommendationCardSkeleton({ shape }: { shape: RecommendationCardShape }) {
  return (
    <div
      aria-hidden="true"
      data-card-skeleton=""
      className={`${shape.width} h-full flex-shrink-0 overflow-hidden rounded-lg border border-border bg-card`}
      // Snap like the real cards do, so the carousel settles at the same scroll offset.
      style={{ scrollSnapAlign: "start" }}
    >
      <div className={`${shape.media} bg-surface ${PULSE}`} />
      <div className={`px-2 py-1.5 ${shape.body}`}>
        <div className="flex h-5 items-center">
          <div className={`h-3 w-3/4 rounded bg-surface ${PULSE}`} />
        </div>
      </div>
      {shape.stats ? <div className={`px-2 pb-1.5 ${RECOMMENDATION_CARD_STATS_ROW}`} /> : null}
    </div>
  );
}

export function recommendationCardSkeletons(shape: RecommendationCardShape, rows = 1) {
  return Array.from({ length: SKELETON_CARDS_PER_ROW * clampDashboardRows(rows) }, (_, index) => (
    <RecommendationCardSkeleton key={index} shape={shape} />
  ));
}

/**
 * A recommendation row whose source has not resolved yet, so neither its title nor its items are
 * known. It mirrors the row header, cards, and page dots of a loaded row.
 */
export function RecommendationRowSkeleton({
  shape = RECOMMENDATION_CARD_SHAPES.video,
}: {
  shape?: RecommendationCardShape;
}) {
  return (
    <div className="recommendation-row" aria-busy="true" data-row-skeleton="">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex h-6 items-center">
          <div className={`h-4 w-40 rounded bg-card ${PULSE}`} />
        </div>
        <span
          aria-hidden="true"
          className="invisible inline-flex min-h-9 items-center px-2 text-sm sm:min-h-0 sm:px-0 sm:text-xs"
        >
          View All
        </span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide px-1"
        style={{
          scrollSnapType: "x mandatory",
          ...dashboardCardWidthStyle(dashboardCardWidthPx(DEFAULT_DASHBOARD_CARD_SIZE)),
        }}
      >
        {recommendationCardSkeletons(shape)}
      </div>
      <div aria-hidden="true" className="mt-2 h-8 sm:h-1" />
    </div>
  );
}

/** The home dashboard before its layout is known: the switcher, its actions, and a few rows. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-busy="true" data-dashboard-skeleton="">
      <span className="sr-only">Loading dashboard</span>
      <div className="flex items-center justify-between gap-3">
        <ol aria-hidden="true" className="flex min-w-0 flex-1 items-center py-1 text-lg sm:text-xl">
          <li className="block py-1">
            <span className={`inline-block h-[0.8em] w-24 rounded bg-card align-middle ${PULSE}`} />
          </li>
        </ol>
        <div aria-hidden="true" className="flex shrink-0 gap-2">
          <span className="inline-block rounded-md border border-border px-2.5 py-2 text-sm sm:px-3">
            <span className="invisible">
              <Plus className="inline h-4 w-4 sm:mr-1" />
              <span className="sr-only sm:not-sr-only">New Dashboard</span>
            </span>
          </span>
          <span className="inline-block rounded-md border border-border bg-card px-2.5 py-2 text-sm sm:px-3">
            <span className="invisible">
              <Settings2 className="inline h-4 w-4 sm:mr-1" />
              <span className="sr-only sm:not-sr-only">Customize</span>
            </span>
          </span>
        </div>
      </div>
      <div className="space-y-5">
        <RecommendationRowSkeleton />
        <RecommendationRowSkeleton />
        <RecommendationRowSkeleton />
      </div>
    </div>
  );
}

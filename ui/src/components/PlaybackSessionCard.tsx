import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { VideoPlaybackSession } from "../api/types";
import { formatDateTime } from "../utils/dateFormat";
import { formatDuration } from "./shared";

/** Sessions with more intervals than this start collapsed. A watch with a few seeks (skip intro, jump back
 * once or twice) yields 1-4 ranges, which fit on a line or two and are worth seeing at a glance; beyond that
 * the chips are usually seek noise (#317: one session hit 140) and would push the other sessions off screen. */
export const PLAYBACK_INTERVALS_COLLAPSE_THRESHOLD = 4;

export function PlaybackSessionCard({ session }: { session: VideoPlaybackSession }) {
  const intervalCount = session.intervals.length;
  const collapsible = intervalCount > PLAYBACK_INTERVALS_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const showIntervals = intervalCount > 0 && (!collapsible || expanded);
  const intervalsId = `playback-session-${session.sessionId}-intervals`;
  const intervalLabel = `${intervalCount} intervals`;

  return (
    <div className="rounded-lg border border-border/70 bg-surface/35 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-foreground">
            {session.isCompleted ? "Completed session" : "Playback session"}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-secondary">
            <span>Watched {formatDuration(session.totalWatchedSec)}</span>
            {session.lastPositionSec != null ? (
              <span>Last position {formatDuration(session.lastPositionSec)}</span>
            ) : null}
            {collapsible ? (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={intervalsId}
                onClick={() => setExpanded((open) => !open)}
                className="inline-flex items-center gap-0.5 hover:text-foreground"
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {intervalLabel}
              </button>
            ) : (
              <span>{intervalLabel}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-xs text-secondary">{formatDateTime(session.startedAt)}</div>
      </div>
      {showIntervals ? (
        <div id={intervalsId} className="mt-2 flex flex-wrap gap-1.5">
          {session.intervals.map((range, index) => (
            <span
              key={`${session.sessionId}-${range.startSec}-${range.endSec}-${index}`}
              className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-secondary"
            >
              {formatDuration(range.startSec)}-{formatDuration(range.endSec)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

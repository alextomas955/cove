import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VideoPlaybackSession } from "../api/types";
import { PLAYBACK_INTERVALS_COLLAPSE_THRESHOLD, PlaybackSessionCard } from "../components/PlaybackSessionCard";

function session(intervalCount: number): VideoPlaybackSession {
  return {
    sessionId: "s1",
    startedAt: "2024-01-02T03:04:05.000Z",
    lastSeenAt: "2024-01-02T03:10:00.000Z",
    state: "ended",
    mediaDurationSec: 3600,
    totalWatchedSec: intervalCount * 2,
    lastPositionSec: 120,
    isCompleted: false,
    intervals: Array.from({ length: intervalCount }, (_, i) => ({
      startSec: i * 10,
      endSec: i * 10 + 2,
      recordedAt: "2024-01-02T03:05:00.000Z",
    })),
  };
}

const chips = () => screen.queryAllByText(/^\d+:\d{2}-\d+:\d{2}$/);

describe("PlaybackSessionCard", () => {
  it("shows a few intervals inline with no toggle", () => {
    render(<PlaybackSessionCard session={session(PLAYBACK_INTERVALS_COLLAPSE_THRESHOLD)} />);
    expect(chips()).toHaveLength(PLAYBACK_INTERVALS_COLLAPSE_THRESHOLD);
    expect(screen.getByText(`${PLAYBACK_INTERVALS_COLLAPSE_THRESHOLD} intervals`).tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("collapses many seek-generated intervals behind the summary and toggles them", () => {
    render(<PlaybackSessionCard session={session(140)} />);
    const toggle = screen.getByRole("button", { name: "140 intervals" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(chips()).toHaveLength(0);
    expect(screen.getByText("Watched 4:40")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(chips()).toHaveLength(140);
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(chips()).toHaveLength(0);
  });
});

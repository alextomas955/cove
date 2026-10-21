import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JobCard } from "../components/JobCard";
import type { JobInfo } from "../api/types";

function finishedJob(overrides: Partial<JobInfo>): JobInfo {
  return {
    id: "job-1",
    type: "ai.run",
    description: "Run AI on 174 selected video(s)",
    status: "completed",
    progress: 1,
    startedAt: "2026-10-11T00:00:00Z",
    completedAt: "2026-10-11T00:10:00Z",
    ...overrides,
  };
}

describe("JobCard", () => {
  it("does not present a completed job whose units failed as plainly completed", () => {
    render(
      <JobCard
        variant="panel"
        job={finishedJob({ unitsSucceeded: 6, unitsFailed: 168, summary: "6 succeeded, 168 failed, 0 skipped" })}
      />,
    );

    expect(screen.getByText("completed with failures")).toBeInTheDocument();
    expect(screen.queryByText("completed")).not.toBeInTheDocument();
    // The badge says it; the icon beside it is not announced a second time.
    expect(screen.queryByLabelText("Completed with failures")).not.toBeInTheDocument();
  });

  it("presents a completed job without failed units as completed", () => {
    render(
      <JobCard
        variant="panel"
        job={finishedJob({ unitsSucceeded: 6, unitsSkipped: 2, summary: "6 succeeded, 0 failed, 2 skipped" })}
      />,
    );

    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("marks a completed job with failed units in the jobs drawer too", () => {
    render(<JobCard job={finishedJob({ unitsSucceeded: 1, unitsFailed: 1 })} />);

    expect(screen.getByRole("img", { name: "Completed with failures" })).toBeInTheDocument();
  });

  it("offers Retry only for a finished job the server can retry", async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <JobCard variant="panel" job={finishedJob({ status: "failed", canRetry: true })} onRetry={onRetry} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(onRetry).toHaveBeenCalledWith("job-1"));

    rerender(<JobCard variant="panel" job={finishedJob({ status: "failed", canRetry: false })} onRetry={onRetry} />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("shows why a retry could not start", async () => {
    const onRetry = vi.fn().mockRejectedValue(new Error("API Error 409: already downloaded"));
    render(<JobCard job={finishedJob({ canRetry: true })} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry job" }));

    expect(await screen.findByText("Retry failed: API Error 409: already downloaded")).toBeInTheDocument();
  });
});

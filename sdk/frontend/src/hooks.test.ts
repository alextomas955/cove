import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  DEFAULT_JOB_POLL_INTERVAL_MS,
  isTerminalJobStatus,
  jobPollingQueryOptions,
} from "./hooks";
import type { CoveClient } from "./api";
import type { JobInfo, JobStatus } from "./types";

function jobInfo(status: JobStatus): JobInfo {
  return {
    id: "job-1",
    description: "test job",
    progress: 0,
    startedAt: new Date(0).toISOString(),
    status,
    type: "test",
  };
}

/**
 * A minimal stand-in for the typed client whose GET yields the next status in `statuses`
 * (repeating the last one once exhausted), and counts how many times it was invoked.
 */
function stubClient(statuses: JobStatus[]) {
  let index = 0;
  const GET = vi.fn(async () => {
    const status = statuses[Math.min(index, statuses.length - 1)];
    index += 1;
    return { data: jobInfo(status), error: undefined, response: new Response(null, { status: 200 }) };
  });
  return { client: { GET } as unknown as CoveClient, GET };
}

function newQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

describe("isTerminalJobStatus", () => {
  it("is true for completed, failed, and cancelled", () => {
    expect(isTerminalJobStatus("completed")).toBe(true);
    expect(isTerminalJobStatus("failed")).toBe(true);
    expect(isTerminalJobStatus("cancelled")).toBe(true);
  });

  it("is false for pending, running, and absent status", () => {
    expect(isTerminalJobStatus("pending")).toBe(false);
    expect(isTerminalJobStatus("running")).toBe(false);
    expect(isTerminalJobStatus(undefined)).toBe(false);
  });
});

describe("jobPollingQueryOptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls on the interval while the job is running and stops once it is terminal", async () => {
    const { client, GET } = stubClient(["running", "running", "completed"]);
    const qc = newQueryClient();
    const observer = new QueryObserver(
      qc,
      jobPollingQueryOptions("job-1", { intervalMs: 1000, client }),
    );
    const unsubscribe = observer.subscribe(() => {});

    // Initial fetch (running).
    await vi.advanceTimersByTimeAsync(0);
    expect(GET).toHaveBeenCalledTimes(1);

    // Two interval ticks: second running, then completed.
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(GET).toHaveBeenCalledTimes(3);
    expect(observer.getCurrentResult().data?.status).toBe("completed");

    // Terminal status stops polling: no further fetches even after several intervals.
    await vi.advanceTimersByTimeAsync(5000);
    expect(GET).toHaveBeenCalledTimes(3);

    unsubscribe();
    qc.clear();
  });

  it("is disabled and never fetches when jobId is null", async () => {
    const { client, GET } = stubClient(["running"]);
    const options = jobPollingQueryOptions(null, { intervalMs: 1000, client });
    expect(options.enabled).toBe(false);

    const qc = newQueryClient();
    const observer = new QueryObserver(qc, options);
    const unsubscribe = observer.subscribe(() => {});

    await vi.advanceTimersByTimeAsync(5000);
    expect(GET).not.toHaveBeenCalled();

    unsubscribe();
    qc.clear();
  });

  it("defaults to a ~1.5s cadence", () => {
    expect(DEFAULT_JOB_POLL_INTERVAL_MS).toBe(1500);
  });
});

import { describe, expect, it, vi } from "vitest";
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

/** Invoke the options' refetchInterval callback with a query carrying the given status. */
function refetchIntervalFor(
  options: ReturnType<typeof jobPollingQueryOptions>,
  status: JobStatus | undefined,
): number | false | undefined {
  const query = { state: { data: status ? jobInfo(status) : undefined } };
  const refetchInterval = options.refetchInterval;
  if (typeof refetchInterval !== "function") {
    throw new Error("expected refetchInterval to be a function");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return refetchInterval(query as any);
}

describe("jobPollingQueryOptions", () => {
  it("keeps polling on the interval while the job is not terminal", () => {
    const { client } = stubClient(["running"]);
    const options = jobPollingQueryOptions("job-1", { intervalMs: 1000, client });

    expect(refetchIntervalFor(options, "pending")).toBe(1000);
    expect(refetchIntervalFor(options, "running")).toBe(1000);
    // Before the first fetch there is no data yet — still poll.
    expect(refetchIntervalFor(options, undefined)).toBe(1000);
  });

  it("stops polling once the job reaches a terminal status", () => {
    const { client } = stubClient(["completed"]);
    const options = jobPollingQueryOptions("job-1", { intervalMs: 1000, client });

    expect(refetchIntervalFor(options, "completed")).toBe(false);
    expect(refetchIntervalFor(options, "failed")).toBe(false);
    expect(refetchIntervalFor(options, "cancelled")).toBe(false);
  });

  it("fetches the job through the injected client when enabled", async () => {
    const { client, GET } = stubClient(["running"]);
    const qc = newQueryClient();
    const observer = new QueryObserver(qc, jobPollingQueryOptions("job-1", { client }));

    const result = await observer.refetch();

    expect(GET).toHaveBeenCalledTimes(1);
    expect(GET).toHaveBeenCalledWith("/api/Jobs/{jobId}", {
      params: { path: { jobId: "job-1" } },
    });
    expect(result.data?.status).toBe("running");
    qc.clear();
  });

  it("is disabled and never fetches when jobId is null", async () => {
    const { client, GET } = stubClient(["running"]);
    const options = jobPollingQueryOptions(null, { intervalMs: 1000, client });
    expect(options.enabled).toBe(false);

    const qc = newQueryClient();
    const observer = new QueryObserver(qc, options);
    const unsubscribe = observer.subscribe(() => {});

    // A disabled query does not fetch on subscribe.
    await Promise.resolve();
    expect(GET).not.toHaveBeenCalled();

    unsubscribe();
    qc.clear();
  });

  it("defaults to a ~1.5s cadence", () => {
    expect(DEFAULT_JOB_POLL_INTERVAL_MS).toBe(1500);
  });
});

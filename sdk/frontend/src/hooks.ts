import { useState, useCallback, useEffect, useMemo } from "react";
import { queryOptions, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { request, createExtensionStore, getCoveClient, ApiError } from "./api";
import type { CoveClient } from "./api";
import type { FindFilter, JobInfo, JobStatus } from "./types";

/**
 * Hook for fetching data with loading and error states.
 * Lighter than react-query for simple extension use cases.
 */
export function useFetch<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!!url);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    if (!url) return;
    setIsLoading(true);
    setError(null);
    request<T>(url)
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [url, ...deps]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

/**
 * Hook for extension key-value store operations.
 */
export function useExtensionStore(extensionId: string) {
  const store = useMemo(() => createExtensionStore(extensionId), [extensionId]);
  return store;
}

/**
 * Hook for managing paginated/filterable entity lists.
 * Provides filter state, page navigation, and data fetching.
 */
export function useEntityList<T>(
  basePath: string,
  defaultFilter: FindFilter = { page: 1, perPage: 40, sort: "name", direction: "asc" }
) {
  const [filter, setFilter] = useState<FindFilter>(defaultFilter);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filter.page) params.set("page", String(filter.page));
    if (filter.perPage) params.set("perPage", String(filter.perPage));
    if (filter.sort) params.set("sort", filter.sort);
    if (filter.direction) params.set("direction", filter.direction);
    if (filter.q) params.set("q", filter.q);
    return params.toString();
  }, [filter]);

  const url = `${basePath}?${queryParams}`;
  const { data, isLoading, error, refetch } = useFetch<{ items: T[]; totalCount: number }>(url, [queryParams]);

  const setPage = useCallback((page: number) => setFilter(f => ({ ...f, page })), []);
  const setSort = useCallback((sort: string, direction?: "asc" | "desc") =>
    setFilter(f => ({ ...f, sort, direction: direction ?? f.direction, page: 1 })), []);
  const setQuery = useCallback((query: string) =>
    setFilter(f => ({ ...f, q: query, page: 1 })), []);

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
    filter,
    setFilter,
    setPage,
    setSort,
    setQuery,
    refetch,
  };
}

/** Job statuses a job will never leave — once reached, there is nothing left to poll for. */
const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ["completed", "failed", "cancelled"];

/** Default poll cadence for {@link useJobPolling}, in milliseconds. */
export const DEFAULT_JOB_POLL_INTERVAL_MS = 1500;

/** True once a job has reached a terminal status (completed, failed, or cancelled). */
export function isTerminalJobStatus(status: JobStatus | null | undefined): boolean {
  return status != null && TERMINAL_JOB_STATUSES.includes(status);
}

export interface UseJobPollingOptions {
  /** Poll cadence while the job is still running (default {@link DEFAULT_JOB_POLL_INTERVAL_MS}). */
  intervalMs?: number;
  /**
   * Client used to fetch the job. Defaults to the shared host-auth client; override it in tests
   * or to target a different origin.
   */
  client?: CoveClient;
}

/**
 * Build the react-query options for polling a single job to completion. Exposed so the polling
 * behaviour (interval, terminal-status stop, disabled-when-null) can be exercised directly.
 */
export function jobPollingQueryOptions(jobId: string | null, options?: UseJobPollingOptions) {
  const intervalMs = options?.intervalMs ?? DEFAULT_JOB_POLL_INTERVAL_MS;
  const client = options?.client ?? getCoveClient();
  return queryOptions({
    queryKey: ["cove-job", jobId] as const,
    enabled: jobId != null,
    queryFn: async (): Promise<JobInfo> => {
      const { data, error, response } = await client.GET("/api/Jobs/{jobId}", {
        params: { path: { jobId: jobId as string } },
      });
      if (error) {
        // This endpoint declares no error schema, so `error`/`response` are typed `never` even
        // though the client populates them on a non-2xx response — launder `response` back to
        // the concrete Response to read the status.
        const res = response as Response;
        const body = typeof error === "string" ? error : JSON.stringify(error);
        throw new ApiError(res.status, body, `/api/Jobs/${jobId}`);
      }
      return data as JobInfo;
    },
    // Stop polling as soon as the job is terminal; otherwise re-poll on the interval.
    refetchInterval: (query) => {
      const status = (query.state.data as JobInfo | undefined)?.status;
      return isTerminalJobStatus(status) ? false : intervalMs;
    },
  });
}

/**
 * Poll a job to completion over the host-shared react-query client. While `jobId` is set and the
 * job is not terminal, the job status is refetched every `intervalMs`; polling stops automatically
 * once the job reaches a terminal status (completed, failed, or cancelled). Passing `null` disables
 * the query. Prefer this over a hand-rolled `setInterval`.
 */
export function useJobPolling(
  jobId: string | null,
  options?: UseJobPollingOptions,
): UseQueryResult<JobInfo> {
  return useQuery(jobPollingQueryOptions(jobId, options));
}

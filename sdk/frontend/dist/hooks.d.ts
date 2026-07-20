import { type UseQueryResult } from "@tanstack/react-query";
import type { CoveClient } from "./api";
import type { FindFilter, JobInfo, JobStatus } from "./types";
/**
 * Hook for fetching data with loading and error states.
 * Lighter than react-query for simple extension use cases.
 */
export declare function useFetch<T>(url: string | null, deps?: unknown[]): {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
};
/**
 * Hook for extension key-value store operations.
 */
export declare function useExtensionStore(extensionId: string): {
    getAll: () => Promise<Record<string, string>>;
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
};
/**
 * Hook for managing paginated/filterable entity lists.
 * Provides filter state, page navigation, and data fetching.
 */
export declare function useEntityList<T>(basePath: string, defaultFilter?: FindFilter): {
    items: T[];
    totalCount: number;
    isLoading: boolean;
    error: Error | null;
    filter: {
        direction?: import("@cove/types").components["schemas"]["SortDirection"];
        page?: number;
        perPage?: number;
        q?: string;
        seed?: number;
        sort?: string;
    };
    setFilter: import("react").Dispatch<import("react").SetStateAction<{
        direction?: import("@cove/types").components["schemas"]["SortDirection"];
        page?: number;
        perPage?: number;
        q?: string;
        seed?: number;
        sort?: string;
    }>>;
    setPage: (page: number) => void;
    setSort: (sort: string, direction?: "asc" | "desc") => void;
    setQuery: (query: string) => void;
    refetch: () => void;
};
/** Default poll cadence for {@link useJobPolling}, in milliseconds. */
export declare const DEFAULT_JOB_POLL_INTERVAL_MS = 1500;
/** True once a job has reached a terminal status (completed, failed, or cancelled). */
export declare function isTerminalJobStatus(status: JobStatus | null | undefined): boolean;
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
export declare function jobPollingQueryOptions(jobId: string | null, options?: UseJobPollingOptions): import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<{
    completedAt?: string;
    description: string;
    error?: string;
    etaSeconds?: number;
    id: string;
    progress: number;
    startedAt: string;
    status: import("@cove/types").components["schemas"]["JobStatus"];
    subTask?: string;
    summary?: string;
    type: string;
    unitsCompleted?: number;
    unitsFailed?: number;
    unitsSkipped?: number;
    unitsSucceeded?: number;
    unitsTotal?: number;
    updatedAt?: string;
}, Error, {
    completedAt?: string;
    description: string;
    error?: string;
    etaSeconds?: number;
    id: string;
    progress: number;
    startedAt: string;
    status: import("@cove/types").components["schemas"]["JobStatus"];
    subTask?: string;
    summary?: string;
    type: string;
    unitsCompleted?: number;
    unitsFailed?: number;
    unitsSkipped?: number;
    unitsSucceeded?: number;
    unitsTotal?: number;
    updatedAt?: string;
}, readonly ["cove-job", string | null]>, "queryFn"> & {
    queryFn?: import("@tanstack/query-core").QueryFunction<{
        completedAt?: string;
        description: string;
        error?: string;
        etaSeconds?: number;
        id: string;
        progress: number;
        startedAt: string;
        status: import("@cove/types").components["schemas"]["JobStatus"];
        subTask?: string;
        summary?: string;
        type: string;
        unitsCompleted?: number;
        unitsFailed?: number;
        unitsSkipped?: number;
        unitsSucceeded?: number;
        unitsTotal?: number;
        updatedAt?: string;
    }, readonly ["cove-job", string | null], never> | undefined;
} & {
    queryKey: readonly ["cove-job", string | null] & {
        [dataTagSymbol]: {
            completedAt?: string;
            description: string;
            error?: string;
            etaSeconds?: number;
            id: string;
            progress: number;
            startedAt: string;
            status: import("@cove/types").components["schemas"]["JobStatus"];
            subTask?: string;
            summary?: string;
            type: string;
            unitsCompleted?: number;
            unitsFailed?: number;
            unitsSkipped?: number;
            unitsSucceeded?: number;
            unitsTotal?: number;
            updatedAt?: string;
        };
        [dataTagErrorSymbol]: Error;
    };
};
/**
 * Poll a job to completion over the host-shared react-query client. While `jobId` is set and the
 * job is not terminal, the job status is refetched every `intervalMs`; polling stops automatically
 * once the job reaches a terminal status (completed, failed, or cancelled). Passing `null` disables
 * the query. Prefer this over a hand-rolled `setInterval`.
 */
export declare function useJobPolling(jobId: string | null, options?: UseJobPollingOptions): UseQueryResult<JobInfo>;
//# sourceMappingURL=hooks.d.ts.map
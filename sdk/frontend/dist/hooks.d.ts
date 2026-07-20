import type { FindFilter } from "./types";
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
//# sourceMappingURL=hooks.d.ts.map
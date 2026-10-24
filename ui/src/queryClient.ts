import { MutationCache, QueryClient } from "@tanstack/react-query";
import { reportMutationFailure } from "./state/mutationFailure";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      suppressGlobalError?: boolean;
    };
  }
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        // Error handlers often only roll back optimistic state, so suppression
        // must be explicit when a workflow already presents its own feedback.
        if (mutation.meta?.suppressGlobalError === true) return;
        reportMutationFailure(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A request that hit the client timeout would only run the same slow query again, doubling
        // both the wait and the server's work before the error shows.
        retry: (failureCount, error) => failureCount < 1 && !isTimeoutError(error),
      },
    },
  });
}

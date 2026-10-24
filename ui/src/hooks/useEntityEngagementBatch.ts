import { useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { entityEngagement } from "../api/client";
import type { AffinityHostType, EntityEngagement } from "../api/types";
import { createBatchedLoader } from "../utils/batchRequests";

// Ids are cached in fixed-size chunks in list order, so a list that grows by appending pages (infinite
// scroll, dashboard rows) only asks for the new chunk; one key over every id would re-request all of
// them each time a page loaded. Chunks that start together still go to the server as one request.
const CHUNK_SIZE = 50;
const loaders = new Map<AffinityHostType, (ids: number[]) => Promise<EntityEngagement[]>>();
function loadEngagement(hostType: AffinityHostType, ids: number[]) {
  let loader = loaders.get(hostType);
  if (!loader) {
    loader = createBatchedLoader(
      (batchIds) => entityEngagement.batch({ hostType, hostIds: batchIds }),
      (engagement) => engagement.hostId,
    );
    loaders.set(hostType, loader);
  }
  return loader(ids);
}

export function useEntityEngagementBatch(hostType: AffinityHostType, hostIds: number[]) {
  const queryClient = useQueryClient();
  // Key the memo on the de-duplicated id list so the chunks only change when the ids do.
  const idsKey = [...new Set(hostIds)].join(",");
  const chunks = useMemo(() => {
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    const result: number[][] = [];
    for (let start = 0; start < ids.length; start += CHUNK_SIZE) result.push(ids.slice(start, start + CHUNK_SIZE));
    return result;
  }, [idsKey]);

  return useQueries({
    queries: chunks.map((chunk) => ({
      queryKey: ["engagement", hostType, "batch", chunk],
      queryFn: async () => {
        const engagements = await loadEngagement(hostType, chunk);
        for (const engagement of engagements) {
          queryClient.setQueryData(["engagement", hostType, engagement.hostId], engagement);
        }
        return engagements;
      },
      staleTime: 30000,
    })),
    combine: combineEngagement,
  });
}

function combineEngagement(results: { data?: EntityEngagement[]; isLoading: boolean }[]) {
  const engagementById = new Map<number, EntityEngagement>();
  for (const result of results) {
    for (const engagement of result.data ?? []) engagementById.set(engagement.hostId, engagement);
  }
  return { engagementById, isLoading: results.some((result) => result.isLoading) };
}

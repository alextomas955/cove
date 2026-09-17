import { useState } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { videos } from "../api/client";
import type { Video, VideoMergeFileHandling } from "../api/types";
import { getApiValidationFailureDetail } from "../utils/requestFailure";
import { ATTACH_FILES, VideoMergeReview } from "./VideoMergeReview";

/**
 * The library merge: loads the kept video and the videos to merge into it, shows the review shell and
 * calls the merge endpoint with the review's choices. Used by the videos page's destination picker and
 * the detail page's merge dialog; the duplicate finder renders the review shell with its own resolve step.
 */
export function VideoMergeEditor({
  sourceIds,
  targetId,
  fileHandling: initialFileHandling = ATTACH_FILES,
  canDeleteFiles = false,
  onClose,
  onMerged,
  queryKeys = [["videos"]],
}: {
  sourceIds: number[];
  targetId: number;
  fileHandling?: VideoMergeFileHandling;
  canDeleteFiles?: boolean;
  onClose: () => void;
  onMerged?: (targetId: number) => void;
  queryKeys?: QueryKey[];
}) {
  const [swapped, setSwapped] = useState(false);
  // Kept here so a swap, which remounts the review, does not forget the files decision.
  const [fileHandling, setFileHandling] = useState(initialFileHandling);
  const canSwap = sourceIds.length === 1;
  const keptId = swapped && canSwap ? sourceIds[0] : targetId;
  const removedIds = swapped && canSwap ? [targetId] : [...sourceIds].sort((a, b) => a - b);
  const ids = [targetId, ...sourceIds];
  const data = useQuery({
    queryKey: ["video-merge-comparison", ...ids],
    queryFn: async () => {
      const loaded = await Promise.all(ids.map((id) => videos.get(id)));
      return Object.fromEntries(loaded.map((video) => [video.id, video])) as Record<number, Video>;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const qc = useQueryClient();
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 sm:p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-merge-title"
        className="flex h-full w-full max-w-7xl flex-col overflow-hidden border-border bg-surface text-foreground shadow-xl sm:h-auto sm:max-h-[95vh] sm:rounded-2xl sm:border"
      >
        {data.data ? (
          <VideoMergeReview
            key={`${keptId}:${removedIds.join(",")}`}
            kept={data.data[keptId]}
            removed={removedIds.map((id) => data.data![id])}
            fileHandling={fileHandling}
            onFileHandlingChange={setFileHandling}
            canDeleteFiles={canDeleteFiles}
            onSwap={canSwap ? () => setSwapped((current) => !current) : undefined}
            onClose={onClose}
            onConfirm={async ({ metadata, fileHandling: chosenFileHandling }) => {
              await videos.merge(keptId, removedIds, metadata, chosenFileHandling);
              await Promise.all(
                [...queryKeys, ["videos"], ...ids.map((id) => ["video", id])].map((queryKey) =>
                  qc.invalidateQueries({ queryKey }),
                ),
              );
              onMerged?.(keptId);
              onClose();
            }}
          />
        ) : (
          <div className="space-y-4 p-6">
            <h2 id="video-merge-title" className="text-lg font-semibold">
              Merge videos
            </h2>
            <p className="text-sm text-secondary">
              {data.isError ? getApiValidationFailureDetail(data.error) : "Loading video metadata…"}
            </p>
            <div className="flex gap-2">
              {data.isError && (
                <button
                  onClick={() => void data.refetch()}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm"
                >
                  Retry
                </button>
              )}
              <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-secondary hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

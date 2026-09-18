import { useState } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { videoAlignments, videos } from "../api/client";
import type { Video, VideoMergeFileHandling } from "../api/types";
import { getApiValidationFailureDetail } from "../utils/requestFailure";
import { VideoAlignmentDialog } from "./VideoAlignmentDialog";
import { ATTACH_FILES, VideoMergeReview } from "./VideoMergeReview";

/**
 * Makes a merged copy's file the kept video's primary once the merge is through, the way the video's
 * own set-as-primary flow does: nothing when the merge already adopted it (a kept video without a
 * primary takes the first copy's), a direct switch when the files are equivalent or nothing timed is
 * affected, otherwise the alignment dialog. Returns whether the dialog is still needed.
 */
async function switchPrimaryFile(videoId: number, fileId: number): Promise<"done" | "dialog"> {
  try {
    const kept = await videos.get(videoId);
    if (kept.primaryFileId === fileId) return "done";
    const assessment = await videoAlignments.assess(videoId, fileId);
    if (!assessment.equivalent && assessment.dependencyCount > 0) return "dialog";
    await videoAlignments.apply(videoId, {
      fileId,
      resolution: "direct",
      expectedPrimaryFileId: assessment.sourceFileId,
    });
    return "done";
  } catch (error) {
    // The merge already happened; the dialog shows what went wrong and offers the choices.
    console.warn("Setting the primary file after the merge did not go through directly.", error);
    return "dialog";
  }
}

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
  // The merged copy's file still to be made primary through the alignment dialog, after the merge.
  const [aligning, setAligning] = useState<{ videoId: number; fileId: number }>();
  const canSwap = sourceIds.length === 1;
  const keptId = swapped && canSwap ? sourceIds[0] : targetId;
  const removedIds = swapped && canSwap ? [targetId] : [...sourceIds].sort((a, b) => a - b);
  const ids = [targetId, ...sourceIds];
  const comparisonKey = ["video-merge-comparison", ...ids];
  const data = useQuery({
    queryKey: comparisonKey,
    queryFn: async () => {
      const loaded = await Promise.all(ids.map((id) => videos.get(id)));
      return Object.fromEntries(loaded.map((video) => [video.id, video])) as Record<number, Video>;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: aligning == null,
  });
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all(
      [...queryKeys, ["videos"], comparisonKey, ...ids.map((id) => ["video", id])].map((queryKey) =>
        qc.invalidateQueries({ queryKey }),
      ),
    );
  const finish = async () => {
    await refresh();
    onMerged?.(keptId);
    onClose();
  };
  // Once the videos are merged, only the primary-file step is left: the review would show stale
  // copies and could merge them again, so the alignment dialog takes its place.
  if (aligning)
    return (
      <VideoAlignmentDialog
        videoId={aligning.videoId}
        targetFileId={aligning.fileId}
        onClose={() => void finish()}
        onApplied={() => void refresh()}
      />
    );
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
            onConfirm={async ({ metadata, fileHandling: chosenFileHandling, primaryFileId }) => {
              await videos.merge(keptId, removedIds, metadata, chosenFileHandling);
              if (primaryFileId != null && (await switchPrimaryFile(keptId, primaryFileId)) === "dialog") {
                setAligning({ videoId: keptId, fileId: primaryFileId });
                return;
              }
              await finish();
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

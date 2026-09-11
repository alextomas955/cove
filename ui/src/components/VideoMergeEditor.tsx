import { TagBadge } from "./shared";
import { PerformerBadge } from "./EntityCards";
import { getEditableTagIds } from "../utils/tags";
import { GroupedTagOptionList } from "./TagSelector";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { videos, tags } from "../api/client";
import type { Video, VideoMergeMetadata, Tag } from "../api/types";
import { getApiValidationFailureDetail } from "../utils/requestFailure";
import {
  MetadataDiff,
  defaultDiffSelection,
  type DiffField,
  type DiffRecord,
  type DiffSelection,
} from "./MetadataDiff";

const scalarLabels = {
  title: "Title",
  code: "Code",
  details: "Description",
  director: "Director",
  date: "Date",
  studioId: "Studio",
  captions: "Captions",
  organized: "Organized",
  isVr: "VR",
  cover: "Cover",
};
const remoteKey = (item: { endpoint: string; remoteId: string }) =>
  JSON.stringify([item.endpoint.toUpperCase(), item.remoteId.toUpperCase()]);
interface NamedItem {
  id: number;
  name?: string;
  title?: string;
}

export function buildVideoMergeDiff(
  source: Video,
  target: Video,
  unavailableCovers: string[] = [],
  onUnavailable?: (url: string) => void,
) {
  const customKeys = [
    ...new Set([...Object.keys(target.customFields ?? {}), ...Object.keys(source.customFields ?? {})]),
  ];
  const fields: DiffField[] = Object.entries(scalarLabels).map(([key, label]) => ({ key, label }));
  fields.find((field) => field.key === "studioId")!.render = (value) =>
    value == null ? "Empty" : ((value === target.studioId ? target.studioName : source.studioName) ?? "Studio");
  fields.find((field) => field.key === "cover")!.alwaysVisible = true;
  fields.find((field) => field.key === "cover")!.unavailableLabel = "No cover available";
  fields.find((field) => field.key === "cover")!.render = (value) => (
    <img
      src={String(value)}
      alt="Video cover"
      onError={() => onUnavailable?.(String(value))}
      className="max-h-40 w-full rounded object-contain"
    />
  );
  for (const [key, label] of [
    ["tags", "Editable tags"],
    ["performers", "Performers"],
    ["galleries", "Galleries"],
  ]) {
    fields.push({
      key,
      label,
      kind: "list",
      itemKey: (item) => String((item as NamedItem).id),
      render: (item) => (item as NamedItem).name ?? (item as NamedItem).title ?? "Untitled",
    });
  }
  fields.find((field) => field.key === "tags")!.render = (value) => {
    const tag = value as Tag;
    return <TagBadge name={tag.name} tag={tag} />;
  };
  fields.find((field) => field.key === "performers")!.render = (value) => (
    <PerformerBadge performer={value as Video["performers"][number]} />
  );
  fields.push({ key: "urls", label: "URLs", kind: "list", itemKey: (item) => String(item).toUpperCase() });
  fields.push({
    key: "remoteIds",
    label: "Remote IDs",
    kind: "list",
    itemKey: (item) => remoteKey(item as Video["remoteIds"][number]),
    render: (item) => {
      const remote = item as Video["remoteIds"][number];
      return `${remote.endpoint}\n${remote.remoteId}`;
    },
  });
  fields.push(...customKeys.map((key) => ({ key: `custom:${key}`, label: `Custom field · ${key}` })));
  fields.push({
    key: "derivedTags",
    label: "Derived tags",
    readOnly: true,
    render: (value) => {
      const tags = value as Video["tags"];
      return tags.length ? (
        <span className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} tag={tag} />
          ))}
        </span>
      ) : (
        "None"
      );
    },
  });
  const record = (video: Video, label: string): DiffRecord => ({
    label,
    values: {
      ...Object.fromEntries(
        Object.keys(scalarLabels)
          .filter((key) => key !== "cover")
          .map((key) => [key, video[key as keyof Video] ?? null]),
      ),
      derivedTags: video.tags.filter(
        (tag) =>
          tag.canRemove === false ||
          tag.provenance?.some(
            (source) => source.contextType == null && source.sourceKey.trimStart().toLowerCase().startsWith("ext:"),
          ),
      ),
      ...(!unavailableCovers.includes(video.imagePath ?? videos.screenshotUrl(video.id, video.updatedAt))
        ? { cover: video.imagePath ?? videos.screenshotUrl(video.id, video.updatedAt) }
        : {}),
      tags: video.tags.filter((tag) => getEditableTagIds(video.tags).includes(tag.id)),
      performers: video.performers,
      galleries: video.galleries,
      urls: video.urls,
      remoteIds: video.remoteIds,
      ...Object.fromEntries(customKeys.map((key) => [`custom:${key}`, video.customFields?.[key] ?? null])),
    },
  });
  return { fields, source: record(source, "Source"), target: record(target, "Target") };
}

export function videoMergeMetadata(selection: DiffSelection, source: Video, target: Video): VideoMergeMetadata {
  const keys = (key: string) => selection[key] as string[];
  const chosenUrls = new Map([...source.urls, ...target.urls].map((url) => [url.toUpperCase(), url]));
  const chosenRemoteIds = new Map([...source.remoteIds, ...target.remoteIds].map((item) => [remoteKey(item), item]));
  return {
    fields: Object.fromEntries(
      Object.keys(scalarLabels).map((key) => [key, selection[key]]),
    ) as VideoMergeMetadata["fields"],
    customFields: Object.fromEntries(
      Object.entries(selection)
        .filter(([key]) => key.startsWith("custom:"))
        .map(([key, side]) => [key.slice(7), side]),
    ) as VideoMergeMetadata["customFields"],
    tagIds: keys("tags").map(Number),
    performerIds: keys("performers").map(Number),
    galleryIds: keys("galleries").map(Number),
    urls: keys("urls").map((key) => chosenUrls.get(key)!),
    remoteIds: keys("remoteIds").map((key) => chosenRemoteIds.get(key)!),
  };
}

export function VideoMergeEditor({
  sourceId,
  targetId,
  onClose,
  onMerged,
  queryKeys = [["videos"]],
}: {
  sourceId: number;
  targetId: number;
  onClose: () => void;
  onMerged?: (targetId: number) => void;
  queryKeys?: QueryKey[];
}) {
  const data = useQuery({
    queryKey: ["video-merge-comparison", sourceId, targetId],
    queryFn: async () => {
      const [source, target] = await Promise.all([videos.get(sourceId), videos.get(targetId)]);
      return { source, target };
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-merge-title"
        className="flex max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl"
      >
        {data.data ? (
          <VideoMergeDraft
            key={`${sourceId}:${targetId}`}
            {...data.data}
            onClose={onClose}
            onMerged={onMerged}
            queryKeys={queryKeys}
          />
        ) : (
          <div className="space-y-4 p-6">
            <h2 id="video-merge-title" className="text-xl font-semibold">
              Compare videos
            </h2>
            <p>{data.isError ? getApiValidationFailureDetail(data.error) : "Loading video metadata…"}</p>
            {data.isError && (
              <button onClick={() => void data.refetch()} className="mr-4">
                Retry
              </button>
            )}
            <button onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoMergeDraft({
  source,
  target,
  onClose,
  onMerged,
  queryKeys,
}: {
  source: Video;
  target: Video;
  onClose: () => void;
  onMerged?: (targetId: number) => void;
  queryKeys: QueryKey[];
}) {
  const [addedTags, setAddedTags] = useState<Tag[]>([]);
  const [unavailableCovers, setUnavailableCovers] = useState<string[]>([]);
  const comparison = useMemo(() => {
    const comparison = buildVideoMergeDiff(source, target, unavailableCovers, (url) => {
      setUnavailableCovers((current) => (current.includes(url) ? current : [...current, url]));
      if (url === (source.imagePath ?? videos.screenshotUrl(source.id, source.updatedAt)))
        setSelection((current) => ({ ...current, cover: "target" }));
    });
    const tagField = comparison.fields.find((field) => field.key === "tags")!;
    tagField.additionalItems = addedTags;
    tagField.renderListEditor = (selected, onChange, disabled) => (
      <MergeTagSearch
        selected={selected}
        disabled={disabled}
        onAdd={(tag) => {
          setAddedTags((current) => (current.some((item) => item.id === tag.id) ? current : [...current, tag]));
          onChange([...new Set([...selected, String(tag.id)])]);
        }}
      />
    );
    return comparison;
  }, [source, target, addedTags, unavailableCovers]);
  const [selection, setSelection] = useState(() =>
    defaultDiffSelection(comparison.fields, comparison.source, comparison.target),
  );
  const qc = useQueryClient();
  const mutation = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: () => videos.merge(target.id, [source.id], videoMergeMetadata(selection, source, target)),
    onSuccess: async () => {
      await Promise.all(
        [...queryKeys, ["videos"], ["video", target.id], ["video", source.id]].map((queryKey) =>
          qc.invalidateQueries({ queryKey }),
        ),
      );
      onMerged?.(target.id);
      onClose();
    },
  });
  return (
    <>
      <header className="border-b border-border px-5 py-4">
        <h2 id="video-merge-title" className="text-xl font-semibold">
          Compare and merge videos
        </h2>
        <p className="mt-1 text-sm text-secondary">
          Choose values from either side. The middle column shows the result.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <p>Source · {source.title || "Untitled"}</p>
          <p className="text-accent">Result · keeps target identity</p>
          <p>Target · {target.title || "Untitled"}</p>
        </div>
      </header>
      <div className="overflow-y-auto p-5">
        <MetadataDiff {...comparison} value={selection} onChange={setSelection} disabled={mutation.isPending} />
        <p className="mt-5 rounded border border-border p-3 text-sm text-secondary">
          Derived tags remain managed by their providers; the target’s derived tags are retained. All files, group
          memberships, segments, detections, and child clips follow the existing merge behavior. Timestamps remain
          unchanged. The target primary file is kept; if it has none, the source primary file is used.
        </p>
      </div>
      <footer className="border-t border-border px-5 py-4">
        {mutation.isError && (
          <p role="alert" className="mb-3 text-sm text-red-400">
            {getApiValidationFailureDetail(mutation.error)}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-secondary">Merging removes the source video. Media files are kept.</p>
          <div className="flex gap-3">
            <button
              disabled={mutation.isPending}
              onClick={onClose}
              className="rounded border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Back
            </button>
            <button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="rounded bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {mutation.isPending ? "Merging…" : "Merge videos"}
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}

function MergeTagSearch({
  selected,
  onAdd,
  disabled,
}: {
  selected: string[];
  onAdd: (tag: Tag) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const results = useQuery({
    queryKey: ["merge-tag-search", search],
    queryFn: () => tags.find({ q: search, perPage: 30 }),
    enabled: search.trim().length > 0,
  });
  return (
    <div className="mx-auto max-w-md">
      <label className="text-xs text-secondary">
        Add a library tag to the result
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
          placeholder="Search tags…"
          className="mt-1 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground"
        />
      </label>
      {search.trim() &&
        (results.isError ? (
          <p role="alert" className="text-sm text-red-400">
            Could not load tags.
          </p>
        ) : results.isLoading ? (
          <p className="text-sm text-secondary">Loading tags…</p>
        ) : (
          <GroupedTagOptionList
            tags={results.data?.items ?? []}
            selectedIds={selected.map(Number)}
            onSelect={(tag) => {
              if (!disabled) {
                onAdd(tag);
                setSearch("");
              }
            }}
          />
        ))}
    </div>
  );
}

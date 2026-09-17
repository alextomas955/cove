import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { ArrowLeftRight, ArrowRight, GitMerge, Info, X } from "lucide-react";
import { videos, tags } from "../api/client";
import type { Video, VideoMergeMetadata, Tag, MetadataServer } from "../api/types";
import { useOptionalAppConfig } from "../state/AppConfigContext";
import { getApiValidationFailureDetail } from "../utils/requestFailure";
import { getEditableTagIds } from "../utils/tags";
import { metadataServerLabel } from "./MetadataServerLinks";
import { GroupedTagOptionList } from "./TagSelector";
import { formatDuration } from "./shared";
import {
  MetadataDiff,
  defaultDiffSelection,
  summarizeDiff,
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

export const KEPT_LABEL = "Kept video";
export const MERGED_LABEL = "Merged video";

const coverUrl = (video: Video) => video.imagePath ?? videos.screenshotUrl(video.id, video.updatedAt);

export function buildVideoMergeDiff(
  source: Video,
  target: Video,
  unavailableCovers: string[] = [],
  onUnavailable?: (url: string) => void,
  metadataServers: Pick<MetadataServer, "endpoint" | "name">[] = [],
) {
  const customKeys = [
    ...new Set([...Object.keys(target.customFields ?? {}), ...Object.keys(source.customFields ?? {})]),
  ];
  const fields: DiffField[] = Object.entries(scalarLabels).map(([key, label]) => ({ key, label }));
  fields.find((field) => field.key === "studioId")!.render = (value) =>
    value == null ? (
      <span className="text-muted italic">Empty</span>
    ) : (
      ((value === target.studioId ? target.studioName : source.studioName) ?? "Studio")
    );
  fields.find((field) => field.key === "title")!.render = (value) =>
    value == null || value === "" ? <span className="text-muted italic">Empty · shows file name</span> : String(value);
  const cover = fields.find((field) => field.key === "cover")!;
  cover.alwaysVisible = true;
  cover.unavailableLabel = "No cover available";
  cover.render = (value) => (
    <img
      src={String(value)}
      alt="Video cover"
      onError={() => onUnavailable?.(String(value))}
      className="max-h-40 w-full rounded object-contain"
    />
  );
  for (const [key, label] of [
    ["tags", "Tags"],
    ["performers", "Performers"],
    ["galleries", "Galleries"],
  ]) {
    fields.push({
      key,
      label,
      kind: "list",
      itemKey: (item) => String((item as NamedItem).id),
      itemLabel: (item) => (item as NamedItem).name ?? (item as NamedItem).title ?? "Untitled",
      renderItem: (item) => (item as NamedItem).name ?? (item as NamedItem).title ?? "Untitled",
    });
  }
  fields.find((field) => field.key === "tags")!.renderItem = (value) => {
    const tag = value as Tag;
    return (
      <span className="inline-flex items-center gap-1.5">
        {tag.color || tag.tagGroupColor ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: tag.color ?? tag.tagGroupColor ?? undefined }}
          />
        ) : null}
        {tag.name}
      </span>
    );
  };
  fields.find((field) => field.key === "performers")!.renderItem = (value) => {
    const performer = value as Video["performers"][number];
    return (
      <span className="inline-flex items-center gap-1.5">
        {performer.imagePath ? (
          <img src={performer.imagePath} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
        ) : null}
        {performer.name}
      </span>
    );
  };
  fields.push({ key: "urls", label: "URLs", kind: "list", itemKey: (item) => String(item).toUpperCase() });
  fields.push({
    key: "remoteIds",
    label: "Remote IDs",
    kind: "list",
    itemKey: (item) => remoteKey(item as Video["remoteIds"][number]),
    itemLabel: (item) => {
      const remote = item as Video["remoteIds"][number];
      return `${metadataServerLabel(remote.endpoint, metadataServers)}: ${remote.remoteId}`;
    },
    render: (item) => {
      const remote = item as Video["remoteIds"][number];
      return `${metadataServerLabel(remote.endpoint, metadataServers)}\n${remote.remoteId}`;
    },
    renderItem: (item) => {
      const remote = item as Video["remoteIds"][number];
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-secondary">{metadataServerLabel(remote.endpoint, metadataServers)}</span>
          <span className="font-mono text-[11px]">{remote.remoteId}</span>
        </span>
      );
    },
  });
  fields.push(...customKeys.map((key) => ({ key: `custom:${key}`, label: `Custom · ${key}` })));
  fields.push({
    key: "derivedTags",
    label: "Derived tags",
    readOnly: true,
    render: (value) => {
      const tags = value as Video["tags"];
      return tags.length ? tags.map((tag) => tag.name).join(", ") : <span className="text-muted italic">None</span>;
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
      ...(!unavailableCovers.includes(coverUrl(video)) ? { cover: coverUrl(video) } : {}),
      tags: video.tags.filter((tag) => getEditableTagIds(video.tags).includes(tag.id)),
      performers: video.performers,
      galleries: video.galleries,
      urls: video.urls,
      remoteIds: video.remoteIds,
      ...Object.fromEntries(customKeys.map((key) => [`custom:${key}`, video.customFields?.[key] ?? null])),
    },
    provenance: Object.fromEntries(
      (video.fieldProvenance ?? []).map((entry) => [
        entry.fieldKey,
        metadataServerLabel(entry.sourceKey, metadataServers),
      ]),
    ),
  });
  return { fields, source: record(source, MERGED_LABEL), target: record(target, KEPT_LABEL) };
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
  const [swapped, setSwapped] = useState(false);
  const keptId = swapped ? sourceId : targetId;
  const mergedId = swapped ? targetId : sourceId;
  const data = useQuery({
    queryKey: ["video-merge-comparison", sourceId, targetId],
    queryFn: async () => {
      const [a, b] = await Promise.all([videos.get(sourceId), videos.get(targetId)]);
      return { [sourceId]: a, [targetId]: b } as Record<number, Video>;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 sm:p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-merge-title"
        className="flex h-full w-full max-w-7xl flex-col overflow-hidden border-border bg-surface text-foreground shadow-xl sm:h-auto sm:max-h-[95vh] sm:rounded-2xl sm:border"
      >
        {data.data ? (
          <VideoMergeDraft
            key={`${keptId}:${mergedId}`}
            source={data.data[mergedId]}
            target={data.data[keptId]}
            onSwap={() => setSwapped((current) => !current)}
            onClose={onClose}
            onMerged={onMerged}
            queryKeys={queryKeys}
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

function videoSummary(video: Video) {
  const file = video.files.find((item) => item.id === video.primaryFileId) ?? video.files[0];
  const parts = [
    file?.height ? `${file.height}p` : null,
    file?.duration ? formatDuration(file.duration) : null,
    `${video.files.length} ${video.files.length === 1 ? "file" : "files"}`,
    `${video.performers.length} ${video.performers.length === 1 ? "performer" : "performers"}`,
    `${video.tags.length} ${video.tags.length === 1 ? "tag" : "tags"}`,
  ].filter(Boolean);
  return {
    title: video.title || file?.basename || `Video ${video.id}`,
    subtitle: [video.date, video.studioName ?? "No studio"].filter(Boolean).join(" · "),
    meta: parts.join(" · "),
  };
}

function VideoCard({ role, tone, video }: { role: string; tone: "keep" | "remove"; video: Video }) {
  const summary = videoSummary(video);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span
        className={`text-[11px] font-bold uppercase tracking-wider ${tone === "keep" ? "text-accent" : "text-red-400"}`}
      >
        {role}
      </span>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-2.5">
        <img
          src={coverUrl(video)}
          alt=""
          className="h-[63px] w-28 shrink-0 rounded-lg bg-black object-cover"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="line-clamp-2 text-sm font-semibold leading-snug">{summary.title}</span>
          <span className="truncate text-xs text-secondary">{summary.subtitle}</span>
          <span className="truncate text-[11px] text-muted">{summary.meta}</span>
        </div>
      </div>
    </div>
  );
}

function VideoMergeDraft({
  source,
  target,
  onSwap,
  onClose,
  onMerged,
  queryKeys,
}: {
  source: Video;
  target: Video;
  onSwap: () => void;
  onClose: () => void;
  onMerged?: (targetId: number) => void;
  queryKeys: QueryKey[];
}) {
  const [addedTags, setAddedTags] = useState<Tag[]>([]);
  const metadataServers = useOptionalAppConfig()?.config?.scraping?.metadataServers;
  const [unavailableCovers, setUnavailableCovers] = useState<string[]>([]);
  const comparison = useMemo(() => {
    const comparison = buildVideoMergeDiff(
      source,
      target,
      unavailableCovers,
      (url) => {
        setUnavailableCovers((current) => (current.includes(url) ? current : [...current, url]));
        if (url === coverUrl(source)) setSelection((current) => ({ ...current, cover: "target" }));
      },
      metadataServers,
    );
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
  }, [source, target, addedTags, unavailableCovers, metadataServers]);
  const [selection, setSelection] = useState(() =>
    defaultDiffSelection(comparison.fields, comparison.source, comparison.target),
  );
  const summary = useMemo(
    () => summarizeDiff(comparison.fields, comparison.source, comparison.target, selection),
    [comparison, selection],
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
  const resultTitle = selection.title === "source" ? source.title : target.title;
  const resultStudio = selection.studioId === "source" ? source.studioName : target.studioName;
  const resultDate = selection.date === "source" ? source.date : target.date;
  const performerCount = (selection.performers as string[]).length;
  const dotClass: Record<string, string> = {
    filled: "bg-green-400",
    listAdded: "bg-green-400",
    taken: "bg-amber-400",
    conflictKept: "bg-amber-400",
    listRemoved: "bg-muted",
    identical: "bg-muted",
  };
  const resultPanel = (
    <aside
      aria-label="Result"
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5 lg:sticky lg:top-0 lg:w-[280px] lg:shrink-0"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Result</span>
      <div className="flex items-start gap-2.5">
        <img
          src={selection.cover === "source" ? coverUrl(source) : coverUrl(target)}
          alt=""
          className="h-[54px] w-24 shrink-0 rounded-md bg-black object-cover"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="line-clamp-2 text-[13px] font-semibold leading-snug">
            {resultTitle || target.files[0]?.basename || `Video ${target.id}`}
          </span>
          <span className="text-[11px] text-secondary">
            {[
              resultDate,
              resultStudio ?? "No studio",
              `${target.files.length + source.files.length} files`,
              `${performerCount} performers`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </div>
      <div className="h-px bg-border" />
      <span className="text-xs font-semibold">
        {summary.changeCount} {summary.changeCount === 1 ? "change" : "changes"}
      </span>
      <ul className="flex flex-col gap-1.5">
        {summary.changes.map((change, index) => (
          <li key={index} className="flex items-start gap-2 text-xs leading-snug text-secondary">
            <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${dotClass[change.kind]}`} />
            <span>{change.text}</span>
          </li>
        ))}
      </ul>
      <div className="h-px bg-border" />
      <p className="text-[11px] leading-relaxed text-muted">
        Both videos' files stay and attach to the kept video. Segments, group memberships, detections and child clips
        are combined. Derived tags stay managed by their providers. The merged video is removed. Timestamps do not
        change.
      </p>
    </aside>
  );
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <GitMerge className="h-[18px] w-[18px] text-secondary" />
          <h2 id="video-merge-title" className="text-lg font-semibold">
            Merge videos
          </h2>
          <span className="hidden text-sm text-secondary sm:inline">
            Pick what the kept video ends up with. Nothing changes until you confirm.
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-md p-1.5 text-secondary hover:bg-card hover:text-foreground"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <VideoCard role="Merge in, then remove" tone="remove" video={source} />
          <div className="flex items-center gap-2 self-start text-muted lg:flex-col lg:self-center">
            <ArrowRight className="hidden h-5 w-5 lg:block" />
            <button
              type="button"
              onClick={onSwap}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-secondary hover:bg-card hover:text-foreground"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
            </button>
          </div>
          <VideoCard role="Keep" tone="keep" video={target} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 lg:flex-row lg:gap-5 lg:overflow-hidden">
        <section aria-label="Fields" className="min-w-0 flex-1 lg:overflow-y-auto lg:pr-1">
          <MetadataDiff {...comparison} value={selection} onChange={setSelection} disabled={mutation.isPending} />
        </section>
        <div className="lg:hidden">
          <details className="rounded-xl border border-border bg-card">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">
              <span className="text-accent">Result</span>{" "}
              <span className="font-normal text-secondary">· {summary.changeCount} changes · 1 video removed</span>
            </summary>
            <div className="p-2">{resultPanel}</div>
          </details>
        </div>
        <div className="hidden lg:block">{resultPanel}</div>
      </div>
      <footer className="flex flex-col gap-3 border-t border-border px-5 py-3">
        {mutation.isError && (
          <p role="alert" className="text-sm text-red-400">
            {getApiValidationFailureDetail(mutation.error)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-secondary">
            <Info className="h-3.5 w-3.5" />
            {summary.changeCount} {summary.changeCount === 1 ? "change" : "changes"} · 1 video removed · 0 files deleted
          </p>
          <div className="ml-auto flex gap-2">
            <button
              disabled={mutation.isPending}
              onClick={onClose}
              className="min-h-9 rounded-lg px-4 py-2 text-sm text-secondary hover:text-foreground disabled:opacity-50"
            >
              Back
            </button>
            <button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <GitMerge className="h-3.5 w-3.5" />
              {mutation.isPending ? "Merging…" : "Merge into kept video"}
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
    <div className="max-w-md">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={disabled}
        placeholder="Search tags…"
        aria-label="Add a library tag to the result"
        className="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
      />
      {search.trim() &&
        (results.isError ? (
          <p role="alert" className="mt-1 text-xs text-red-400">
            Could not load tags.
          </p>
        ) : results.isLoading ? (
          <p className="mt-1 text-xs text-secondary">Loading tags…</p>
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

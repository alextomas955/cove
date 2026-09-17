import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ArrowRight, Check, GitMerge, Info, X } from "lucide-react";
import { tags, videos } from "../api/client";
import type { MetadataServer, Tag, Video, VideoMergeFileHandling, VideoMergeMetadata } from "../api/types";
import { useOptionalAppConfig } from "../state/AppConfigContext";
import { getApiValidationFailureDetail } from "../utils/requestFailure";
import { getEditableTagIds } from "../utils/tags";
import { COMPARISON_ROWS, folderOf, primaryFile, rowTones, type ComparisonRow } from "./duplicates/duplicateModel";
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

/**
 * The review shell for a video merge: fold one or more removed videos into one kept video. Every entry
 * point (videos page, detail page, duplicate finder) renders this component with its own defaults and
 * confirm action, so a person sees the same rows, the same Files section and the same Result panel
 * wherever the merge started. The default policy shown here mirrors the backend's: empty kept fields
 * fill from the merged copies, conflicts keep the kept value, lists combine.
 */

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
const MERGED_LABEL_PLURAL = "Merged videos";

/** The library merge attaches the copies' files; the duplicate finder removes them. */
export const ATTACH_FILES: VideoMergeFileHandling = { mode: "attach", deleteFiles: false, deleteGenerated: true };
export const REMOVE_FILES: VideoMergeFileHandling = { mode: "remove", deleteFiles: false, deleteGenerated: true };

export interface VideoMergeChoices {
  metadata: VideoMergeMetadata;
  fileHandling: VideoMergeFileHandling;
}

export const coverUrl = (video: Video) => video.imagePath ?? videos.screenshotUrl(video.id, video.updatedAt);
export const videoTitle = (video: Video) => video.title || primaryFile(video)?.basename || `Video ${video.id}`;

/**
 * Builds the two-sided comparison. With several merged videos the incoming side is one combined record:
 * a scalar takes the first copy (by id) that has a value and carries an origin badge when the copies
 * disagree; lists hold everything the copies have between them. That matches how the backend reads a
 * "source" choice, so what the review shows is what a merge produces.
 */
export function buildVideoMergeDiff(
  sources: Video[],
  target: Video,
  unavailableCovers: string[] = [],
  onUnavailable?: (url: string) => void,
  metadataServers: Pick<MetadataServer, "endpoint" | "name">[] = [],
) {
  const customKeys = [
    ...new Set([target, ...sources].flatMap((video) => Object.keys(video.customFields ?? {}))),
  ];
  const fields: DiffField[] = Object.entries(scalarLabels).map(([key, label]) => ({ key, label }));
  const studioNames = new Map<number, string | undefined>(
    [target, ...sources].filter((video) => video.studioId != null).map((video) => [video.studioId!, video.studioName]),
  );
  fields.find((field) => field.key === "studioId")!.render = (value) =>
    value == null ? (
      <span className="text-muted italic">Empty</span>
    ) : (
      (studioNames.get(Number(value)) ?? "Studio")
    );
  // The backend keeps a kept video organized when any merged copy was; showing that as a fill rather
  // than a conflict makes the review's default match what a merge without choices does.
  fields.find((field) => field.key === "organized")!.isEmpty = (value) => value !== true;
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

  const derivedTags = (video: Video) =>
    video.tags.filter(
      (tag) =>
        tag.canRemove === false ||
        tag.provenance?.some(
          (source) => source.contextType == null && source.sourceKey.trimStart().toLowerCase().startsWith("ext:"),
        ),
    );
  const scalarValues = (video: Video): Record<string, unknown> => ({
    ...Object.fromEntries(
      Object.keys(scalarLabels)
        .filter((key) => key !== "cover")
        .map((key) => [key, video[key as keyof Video] ?? null]),
    ),
    ...(!unavailableCovers.includes(coverUrl(video)) ? { cover: coverUrl(video) } : {}),
    ...Object.fromEntries(customKeys.map((key) => [`custom:${key}`, video.customFields?.[key] ?? null])),
  });
  const provenanceOf = (video: Video) =>
    Object.fromEntries(
      (video.fieldProvenance ?? []).map((entry) => [
        entry.fieldKey,
        metadataServerLabel(entry.sourceKey, metadataServers),
      ]),
    );
  const record = (video: Video, label: string): DiffRecord => ({
    label,
    values: {
      ...scalarValues(video),
      derivedTags: derivedTags(video),
      tags: video.tags.filter((tag) => getEditableTagIds(video.tags).includes(tag.id)),
      performers: video.performers,
      galleries: video.galleries,
      urls: video.urls,
      remoteIds: video.remoteIds,
    },
    provenance: provenanceOf(video),
  });

  // Mirrors the backend's notion of "has a value" (VideoMergeService.HasScalarValue) so the copy the
  // review shows as the incoming side is the copy a "source" choice actually reads from.
  const hasValue = (video: Video, key: string) => {
    if (key === "cover") return Boolean(video.imagePath);
    if (key === "organized" || key === "isVr") return true;
    if (key.startsWith("custom:")) return video.customFields?.[key.slice(7)] != null;
    const value = video[key as keyof Video];
    return typeof value === "string" ? value.trim() !== "" : value != null;
  };
  const combined = (): DiffRecord => {
    const perVideo = sources.map((video) => ({ video, values: scalarValues(video), provenance: provenanceOf(video) }));
    const values: Record<string, unknown> = {};
    const provenance: Record<string, string | undefined> = {};
    for (const key of [...Object.keys(scalarLabels), ...customKeys.map((key) => `custom:${key}`)]) {
      const holders = perVideo.filter((entry) => Object.hasOwn(entry.values, key));
      if (holders.length === 0) continue;
      const withValue = holders.filter((entry) => hasValue(entry.video, key));
      const origin = withValue[0] ?? holders[0];
      values[key] = origin.values[key];
      const disagree = withValue.some((entry) => JSON.stringify(entry.values[key]) !== JSON.stringify(origin.values[key]));
      provenance[key] = disagree ? `From ${videoTitle(origin.video)}` : origin.provenance[key];
    }
    const union = <T,>(items: T[], key: (item: T) => string) => {
      const seen = new Map<string, T>();
      for (const item of items) if (!seen.has(key(item))) seen.set(key(item), item);
      return [...seen.values()];
    };
    return {
      label: MERGED_LABEL_PLURAL,
      values: {
        ...values,
        derivedTags: union(sources.flatMap(derivedTags), (tag) => String(tag.id)),
        tags: union(
          sources.flatMap((video) => video.tags.filter((tag) => getEditableTagIds(video.tags).includes(tag.id))),
          (tag) => String(tag.id),
        ),
        performers: union(sources.flatMap((video) => video.performers), (item) => String(item.id)),
        galleries: union(sources.flatMap((video) => video.galleries), (item) => String(item.id)),
        urls: union(sources.flatMap((video) => video.urls), (url) => url.toUpperCase()),
        remoteIds: union(sources.flatMap((video) => video.remoteIds), remoteKey),
      },
      provenance,
    };
  };

  return {
    fields,
    source: sources.length === 1 ? record(sources[0], MERGED_LABEL) : combined(),
    target: record(target, KEPT_LABEL),
  };
}

export function videoMergeMetadata(selection: DiffSelection, sources: Video[], target: Video): VideoMergeMetadata {
  const keys = (key: string) => selection[key] as string[];
  const all = [...sources, target];
  const chosenUrls = new Map(all.flatMap((video) => video.urls).map((url) => [url.toUpperCase(), url]));
  const chosenRemoteIds = new Map(all.flatMap((video) => video.remoteIds).map((item) => [remoteKey(item), item]));
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

/** File properties compared side by side, the same rows the duplicate finder's group card shows. */
export const FILE_ROWS: ComparisonRow[] = [
  ...COMPARISON_ROWS.filter((row) => row.section === "file"),
  {
    key: "location",
    label: "Location",
    section: "file",
    render: (video) => folderOf(primaryFile(video)?.path) || "—",
    title: (video) => primaryFile(video)?.path,
  },
];

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

function videoSummary(video: Video) {
  const file = primaryFile(video);
  const parts = [
    file?.height ? `${file.height}p` : null,
    file?.duration ? formatDuration(file.duration) : null,
    plural(video.files.length, "file"),
    plural(video.performers.length, "performer"),
    plural(video.tags.length, "tag"),
  ].filter(Boolean);
  return {
    title: videoTitle(video),
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

function VideosCard({ role, videos: list }: { role: string; videos: Video[] }) {
  const files = list.reduce((sum, video) => sum + video.files.length, 0);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">{role}</span>
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2.5">
        <span className="text-sm font-semibold leading-snug">{plural(list.length, "video")} combined</span>
        <ul className="flex flex-col gap-0.5 text-xs text-secondary">
          {list.slice(0, 3).map((video) => (
            <li key={video.id} className="truncate">
              {videoTitle(video)}
            </li>
          ))}
          {list.length > 3 ? <li className="text-muted">and {list.length - 3} more</li> : null}
        </ul>
        <span className="truncate text-[11px] text-muted">{plural(files, "file")}</span>
      </div>
    </div>
  );
}

const toneClass = (tone: string, kept: boolean) =>
  tone === "best"
    ? "text-emerald-300"
    : tone === "worse"
      ? kept
        ? "text-amber-300"
        : "text-secondary"
      : tone === "same"
        ? "text-muted"
        : "text-foreground";

function FilesSection({
  kept,
  removed,
  fileHandling,
  canDeleteFiles,
  disabled,
  onChange,
}: {
  kept: Video;
  removed: Video[];
  fileHandling: VideoMergeFileHandling;
  canDeleteFiles: boolean;
  disabled: boolean;
  onChange: (next: VideoMergeFileHandling) => void;
}) {
  const columns = [...removed, kept];
  const rows = FILE_ROWS.map((row) => ({ row, ...rowTones(row, columns, new Map()) }));
  const removedFiles = removed.reduce((sum, video) => sum + video.files.length, 0);
  const remove = fileHandling.mode === "remove";
  const update = (patch: Partial<VideoMergeFileHandling>) => onChange({ ...fileHandling, ...patch });
  return (
    <section aria-label="Files" className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold">Files</span>
        <span className="text-xs text-muted">
          Best value marked. Files stay attached to the kept video unless you remove them below.
        </span>
      </div>
      <div className="overflow-x-auto" tabIndex={0}>
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted">
              <th scope="col" className="w-28 py-1 pr-3 font-bold">
                Property
              </th>
              {columns.map((video, index) => (
                <th
                  key={video.id}
                  scope="col"
                  className={`py-1 pr-3 font-bold ${index === columns.length - 1 ? "text-accent" : "text-secondary"}`}
                >
                  {index === columns.length - 1 ? KEPT_LABEL : removed.length === 1 ? MERGED_LABEL : videoTitle(video)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ row, tones }) => (
              <tr key={row.key}>
                <th scope="row" className="py-1.5 pr-3 text-left font-semibold text-secondary">
                  {row.label}
                </th>
                {columns.map((video, index) => (
                  <td
                    key={video.id}
                    title={row.title?.(video)}
                    className={`py-1.5 pr-3 ${toneClass(tones[index], index === columns.length - 1)}`}
                  >
                    {tones[index] === "best" ? <Check className="mr-1 inline h-3.5 w-3.5 -translate-y-px" /> : null}
                    {row.render(video, undefined)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <legend className="sr-only">Files decision</legend>
        <div className="grid gap-2 md:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
              !remove ? "border-accent bg-accent/10" : "border-border bg-card"
            }`}
          >
            <input
              type="radio"
              name="video-merge-files"
              checked={!remove}
              onChange={() => update({ mode: "attach", deleteFiles: false })}
              className="mt-0.5 accent-accent"
            />
            <span>
              <span className="block text-sm">Attach {plural(removedFiles, "file")} to the kept video</span>
              <span className="block text-xs text-muted">
                Every file stays in Cove. The kept video ends up with {kept.files.length + removedFiles} files and keeps
                its primary file.
              </span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
              remove ? "border-accent bg-accent/10" : "border-border bg-card"
            }`}
          >
            <input
              type="radio"
              name="video-merge-files"
              checked={remove}
              onChange={() => update({ mode: "remove" })}
              className="mt-0.5 accent-accent"
            />
            <span>
              <span className="block text-sm">
                Remove the merged {removed.length === 1 ? "video's" : "videos'"} {plural(removedFiles, "file")}
              </span>
              <span className="block text-xs text-muted">
                {removed.length === 1 ? "It leaves" : "They leave"} Cove with the merged{" "}
                {removed.length === 1 ? "video" : "videos"}. Markers move only when the files are equivalent.
              </span>
            </span>
          </label>
        </div>
        {remove ? (
          <div className="flex flex-col gap-1.5 pl-1">
            {canDeleteFiles ? (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={fileHandling.deleteFiles}
                  onChange={(event) => update({ deleteFiles: event.target.checked })}
                  className="mt-0.5 accent-red-500"
                />
                <span>
                  <span className={`block ${fileHandling.deleteFiles ? "text-red-300" : ""}`}>Delete the files from disk</span>
                  <span className="block text-xs text-muted">
                    {fileHandling.deleteFiles
                      ? "This cannot be undone."
                      : "Files stay on disk. Unless they are moved or excluded, the next scan will add them back."}
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-xs text-muted">Files stay on disk. You don't have permission to delete video files.</p>
            )}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-secondary">
              <input
                type="checkbox"
                checked={fileHandling.deleteGenerated}
                onChange={(event) => update({ deleteGenerated: event.target.checked })}
                className="accent-accent"
              />
              Delete generated previews, sprites and thumbnails
            </label>
          </div>
        ) : null}
      </fieldset>
    </section>
  );
}

export function VideoMergeReview({
  kept,
  removed,
  fileHandling: initialFileHandling = ATTACH_FILES,
  canDeleteFiles = false,
  onSwap,
  onClose,
  onConfirm,
  onFileHandlingChange,
  titleId = "video-merge-title",
}: {
  kept: Video;
  removed: Video[];
  /** The entry point's default for the copies' files. */
  fileHandling?: VideoMergeFileHandling;
  canDeleteFiles?: boolean;
  /** Offered when exactly one video is merged in: the kept and merged roles trade places. */
  onSwap?: () => void;
  onClose: () => void;
  onConfirm: (choices: VideoMergeChoices) => Promise<unknown>;
  /** Lets the owner remember the files decision across a swap, which remounts the review. */
  onFileHandlingChange?: (next: VideoMergeFileHandling) => void;
  titleId?: string;
}) {
  const sources = useMemo(
    () => [...new Map(removed.map((video) => [video.id, video])).values()].sort((a, b) => a.id - b.id),
    [removed],
  );
  const [addedTags, setAddedTags] = useState<Tag[]>([]);
  const metadataServers = useOptionalAppConfig()?.config?.scraping?.metadataServers;
  const [unavailableCovers, setUnavailableCovers] = useState<string[]>([]);
  const [fileHandling, setFileHandlingState] = useState<VideoMergeFileHandling>(initialFileHandling);
  const setFileHandling = (next: VideoMergeFileHandling) => {
    setFileHandlingState(next);
    onFileHandlingChange?.(next);
  };
  const comparison = useMemo(() => {
    const comparison = buildVideoMergeDiff(
      sources,
      kept,
      unavailableCovers,
      (url) => {
        const unavailable = unavailableCovers.includes(url) ? unavailableCovers : [...unavailableCovers, url];
        setUnavailableCovers(unavailable);
        // Fall back to the kept cover only once no merged copy has a cover left to show.
        if (sources.every((video) => unavailable.includes(coverUrl(video))))
          setSelection((current) => ({ ...current, cover: "target" }));
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
  }, [sources, kept, addedTags, unavailableCovers, metadataServers]);
  const [selection, setSelection] = useState(() =>
    defaultDiffSelection(comparison.fields, comparison.source, comparison.target),
  );
  const summary = useMemo(
    () => summarizeDiff(comparison.fields, comparison.source, comparison.target, selection),
    [comparison, selection],
  );
  const mutation = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: () => onConfirm({ metadata: videoMergeMetadata(selection, sources, kept), fileHandling }),
  });
  const incoming = comparison.source;
  const pick = (key: string) => (selection[key] === "source" ? incoming.values[key] : comparison.target.values[key]);
  const resultTitle = pick("title") as string | null;
  const resultStudioId = pick("studioId") as number | null;
  const resultStudio =
    resultStudioId == null ? null : ([kept, ...sources].find((video) => video.studioId === resultStudioId)?.studioName ?? "Studio");
  const resultDate = pick("date") as string | null;
  const performerCount = (selection.performers as string[]).length;
  const removedFiles = sources.reduce((sum, video) => sum + video.files.length, 0);
  const remove = fileHandling.mode === "remove";
  const resultFiles = remove ? kept.files.length : kept.files.length + removedFiles;
  const copies = plural(sources.length, "copy", "copies");
  const fileNote = remove
    ? `${plural(removedFiles, "file")} ${fileHandling.deleteFiles ? "deleted from disk" : "removed from Cove"}`
    : `${plural(removedFiles, "file")} attached`;
  const outcomeText = remove
    ? `The merged ${sources.length === 1 ? "video's" : "videos'"} ${plural(removedFiles, "file")} ${
        removedFiles === 1 ? "leaves" : "leave"
      } Cove${fileHandling.deleteFiles ? " and " + (removedFiles === 1 ? "is" : "are") + " deleted from disk" : ""}. Group memberships, ratings, favorites and play history are combined. Markers and timed group items move only when the files are equivalent. Derived tags stay managed by their providers. The merged ${
        sources.length === 1 ? "video is" : "videos are"
      } removed. Timestamps do not change.`
    : `${sources.length === 1 ? "Both videos'" : "All"} files stay and attach to the kept video, which keeps its primary file. Segments, group memberships, detections, ratings, favorites, play history and child clips are combined. Derived tags stay managed by their providers. The merged ${
        sources.length === 1 ? "video is" : "videos are"
      } removed. Timestamps do not change.`;
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
          src={String(pick("cover") ?? coverUrl(kept))}
          alt=""
          className="h-[54px] w-24 shrink-0 rounded-md bg-black object-cover"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="line-clamp-2 text-[13px] font-semibold leading-snug">
            {resultTitle || primaryFile(kept)?.basename || `Video ${kept.id}`}
          </span>
          <span className="text-[11px] text-secondary">
            {[resultDate, resultStudio ?? "No studio", plural(resultFiles, "file"), plural(performerCount, "performer")]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </div>
      <div className="h-px bg-border" />
      <span className="text-xs font-semibold">{plural(summary.changeCount, "change")}</span>
      <ul className="flex flex-col gap-1.5">
        {summary.changes.map((change, index) => (
          <li key={index} className="flex items-start gap-2 text-xs leading-snug text-secondary">
            <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${dotClass[change.kind]}`} />
            <span>{change.text}</span>
          </li>
        ))}
      </ul>
      <div className="h-px bg-border" />
      <p className="text-[11px] leading-relaxed text-muted">{outcomeText}</p>
    </aside>
  );
  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <GitMerge className="h-[18px] w-[18px] text-secondary" />
          <h2 id={titleId} className="text-lg font-semibold">
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
          {sources.length === 1 ? (
            <VideoCard role="Merge in, then remove" tone="remove" video={sources[0]} />
          ) : (
            <VideosCard role="Merge in, then remove" videos={sources} />
          )}
          <div className="flex items-center gap-2 self-start text-muted lg:flex-col lg:self-center">
            <ArrowRight className="hidden h-5 w-5 lg:block" />
            {onSwap && sources.length === 1 ? (
              <button
                type="button"
                onClick={onSwap}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-secondary hover:bg-card hover:text-foreground"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
              </button>
            ) : null}
          </div>
          <VideoCard role="Keep" tone="keep" video={kept} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 lg:flex-row lg:gap-5 lg:overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:overflow-y-auto lg:pr-1">
          <FilesSection
            kept={kept}
            removed={sources}
            fileHandling={fileHandling}
            canDeleteFiles={canDeleteFiles}
            disabled={mutation.isPending}
            onChange={setFileHandling}
          />
          <section aria-label="Fields" className="min-w-0">
            <MetadataDiff {...comparison} value={selection} onChange={setSelection} disabled={mutation.isPending} />
          </section>
        </div>
        <div className="lg:hidden">
          <details className="rounded-xl border border-border bg-card">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">
              <span className="text-accent">Result</span>{" "}
              <span className="font-normal text-secondary">
                · {plural(summary.changeCount, "change")} · {plural(sources.length, "video")} removed
              </span>
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
            {plural(summary.changeCount, "change")} · {plural(sources.length, "video")} removed · {fileNote}
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
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                remove && fileHandling.deleteFiles ? "bg-red-600 hover:bg-red-500" : "bg-accent hover:bg-accent-hover"
              }`}
            >
              <GitMerge className="h-3.5 w-3.5" />
              {mutation.isPending ? "Merging…" : `Merge & remove ${copies}`}
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

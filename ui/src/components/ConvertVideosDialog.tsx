import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Cpu, Loader2, TriangleAlert, Zap } from "lucide-react";
import {
  videoConversion,
  type VideoConversionCodec,
  type VideoConversionEncoderInfo,
  type VideoConversionOptions,
} from "../api/client";
import { EditModal } from "./EditModal";

interface Props {
  open: boolean;
  onClose: () => void;
  videoIds: number[];
  /** Whether the viewer may delete files from disk, which replacing originals does. */
  canReplaceOriginals: boolean;
  onStarted?: () => void;
  title?: string;
}

type Settings = Omit<VideoConversionOptions, "videoIds">;

const STORAGE_KEY = "cove.convert-videos.options";

const DEFAULT_SETTINGS: Settings = {
  codec: "hevc",
  container: "mp4",
  quality: "balanced",
  speed: "balanced",
  replaceOriginal: false,
  discardIfLarger: true,
};

const CODECS: ReadonlyArray<{ value: VideoConversionCodec; label: string; hint: string }> = [
  { value: "hevc", label: "HEVC (H.265)", hint: "About half the size of H.264 at the same quality." },
  { value: "h264", label: "H.264", hint: "Plays everywhere; larger files." },
  { value: "av1", label: "AV1", hint: "Smallest files; slow without a recent GPU." },
  {
    value: "copy",
    label: "Keep codec (remux only)",
    hint: "Only changes the container. Takes seconds and loses no quality.",
  },
];

// Keeps the choices someone made last time, and falls back to the defaults when storage is unavailable.
function loadSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Settings> | null;
    // Replacing originals deletes files, so it is never pre-selected from a previous session.
    return { ...DEFAULT_SETTINGS, ...stored, replaceOriginal: false };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, replaceOriginal: false }));
  } catch {
    // Remembering the choices is a convenience only.
  }
}

function EncoderHint({
  codec,
  encoders,
  loading,
}: {
  codec: VideoConversionCodec;
  encoders?: VideoConversionEncoderInfo[];
  loading: boolean;
}) {
  if (codec === "copy") return null;
  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking which encoders this machine can use…
      </p>
    );
  }
  const info = encoders?.find((item) => item.codec === codec);
  if (!info) return null;
  if (!info.encoder) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-red-400">
        <TriangleAlert className="h-3 w-3" /> This ffmpeg build cannot encode {codec.toUpperCase()}.
      </p>
    );
  }
  return info.hardware ? (
    <p className="flex items-center gap-1.5 text-xs text-green-400">
      <Zap className="h-3 w-3" /> GPU encoding with {info.encoder}
    </p>
  ) : (
    <p className="flex items-center gap-1.5 text-xs text-secondary">
      <Cpu className="h-3 w-3" /> CPU encoding with {info.encoder} (no usable GPU encoder; slower)
    </p>
  );
}

const selectClass =
  "w-full bg-input border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent disabled:opacity-50";

export function ConvertVideosDialog({ open, onClose, videoIds, canReplaceOriginals, onStarted, title }: Props) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [submitted, setSubmitted] = useState(false);

  const encodersQuery = useQuery({
    queryKey: ["video-conversion-encoders"],
    queryFn: videoConversion.encoders,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const startMut = useMutation({
    mutationFn: () => videoConversion.start({ ...settings, videoIds }),
    onSuccess: () => {
      saveSettings(settings);
      for (const key of ["jobs", "jobs-active", "jobs-history"]) queryClient.invalidateQueries({ queryKey: [key] });
      setSubmitted(true);
      onStarted?.();
    },
  });

  if (!open) return null;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const reencodes = settings.codec !== "copy";
  const selectedEncoder = encodersQuery.data?.find((item) => item.codec === settings.codec);
  const cannotEncode = reencodes && encodersQuery.isSuccess && !selectedEncoder?.encoder;
  const count = videoIds.length;
  const heading = title ?? `Convert ${count} video${count === 1 ? "" : "s"}`;

  return (
    <EditModal open={open} onClose={onClose} title={heading} maxWidthClassName="sm:max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Each video's primary file is converted into a new file next to it, which is added to the same video. Files
          already in the chosen format are skipped.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="convert-codec">
            Video codec
          </label>
          <select
            id="convert-codec"
            value={settings.codec}
            onChange={(event) => update("codec", event.target.value as VideoConversionCodec)}
            className={selectClass}
          >
            {CODECS.map((codec) => (
              <option key={codec.value} value={codec.value}>
                {codec.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">{CODECS.find((codec) => codec.value === settings.codec)?.hint}</p>
          <EncoderHint codec={settings.codec} encoders={encodersQuery.data} loading={encodersQuery.isLoading} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="convert-container">
              Container
            </label>
            <select
              id="convert-container"
              value={settings.container}
              onChange={(event) => update("container", event.target.value as Settings["container"])}
              className={selectClass}
            >
              <option value="mp4">MP4</option>
              <option value="mkv">MKV</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="convert-quality">
              Quality
            </label>
            <select
              id="convert-quality"
              value={settings.quality}
              disabled={!reencodes}
              onChange={(event) => update("quality", event.target.value as Settings["quality"])}
              className={selectClass}
            >
              <option value="high">High</option>
              <option value="balanced">Balanced</option>
              <option value="small">Smaller files</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="convert-speed">
              Speed
            </label>
            <select
              id="convert-speed"
              value={settings.speed}
              disabled={!reencodes}
              onChange={(event) => update("speed", event.target.value as Settings["speed"])}
              className={selectClass}
            >
              <option value="fast">Fast</option>
              <option value="balanced">Balanced</option>
              <option value="slow">Slow (smaller)</option>
            </select>
          </div>
        </div>
        {settings.container === "mp4" && (
          <p className="text-xs text-muted">
            MP4 can't hold some tracks: audio it can't store is re-encoded to AAC, and image-based subtitles are
            dropped. Choose MKV to keep everything.
          </p>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          {reencodes && (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={settings.discardIfLarger}
                onChange={() => update("discardIfLarger", !settings.discardIfLarger)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
              />
              <span className="text-sm text-foreground">
                Discard the conversion if it isn't smaller than the original
              </span>
            </label>
          )}
          {canReplaceOriginals && (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={settings.replaceOriginal}
                onChange={() => update("replaceOriginal", !settings.replaceOriginal)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-orange-500"
              />
              <span className="text-sm">
                <span className="text-orange-400">Replace the originals</span>
                <span className="block text-xs text-muted">
                  Each converted file is fully decoded to check it isn't corrupt, and checked to be the same footage
                  (length and appearance). Only then does it become the primary file, keeping covers, previews, sprites
                  and markers, and the original is deleted from disk. If any check fails, the original is kept.
                </span>
              </span>
            </label>
          )}
        </div>

        {startMut.error && (
          <p role="alert" className="text-sm text-red-400">
            {(startMut.error as Error).message}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
        {submitted ? (
          <>
            <div className="mr-auto flex items-center gap-2 text-sm text-green-400">
              <Check className="h-4 w-4" />
              Conversion job queued
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="rounded-lg px-4 py-2 text-sm text-secondary hover:bg-surface hover:text-foreground"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-secondary hover:bg-surface hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending || cannotEncode || count === 0}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                settings.replaceOriginal ? "bg-orange-600 hover:bg-orange-500" : "bg-accent hover:bg-accent-hover"
              }`}
            >
              {startMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {settings.replaceOriginal ? "Convert and replace" : "Convert"}
            </button>
          </>
        )}
      </div>
    </EditModal>
  );
}

import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { system } from "../../api/client";
import { patternCssImage } from "../../theme/themeBoot";
import {
  BUILT_IN_PATTERNS,
  cssPatternIsScalable,
  cssPatternStyle,
  loadImageSize,
  parsePatternInput,
  parseSvgFile,
  patternKey,
  readSavedPatterns,
  rememberPattern,
  type PatternParseResult,
  type PatternSource,
  type PatternSourceKind,
} from "../../theme/patternSource";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PATTERN_SITES = [
  { label: "Hero Patterns", href: "https://heropatterns.com" },
  { label: "Pattern Monster", href: "https://pattern.monster" },
  { label: "CSS Pattern", href: "https://css-pattern.com" },
  { label: "fffuel", href: "https://www.fffuel.co" },
];

/** Controls that mean different things per kind are reset when switching kinds. */
const KIND_DEFAULTS: Record<PatternSourceKind, Record<string, string>> = {
  // Pattern sites usually bake their own faint opacity into the SVG, so custom SVGs start
  // stronger than the built-ins' 12% to come out about as visible.
  svg: { opacity: "35", scale: "100" },
  image: { opacity: "60", dim: "25", fit: "cover", scale: "100" },
  css: { opacity: "30", scale: "100" },
};

const BUILT_IN_URLS = new Set(BUILT_IN_PATTERNS.flatMap((pattern) => [pattern.url, ...(pattern.formerUrls ?? [])]));

type Status = { tone: "info" | "error"; text: string } | null;

interface PatternStyleSettingsProps {
  /** The pattern style's stored options (kind, source, sourcekind, sourcewidth, library, tint, ...). */
  options: Record<string, string>;
  /** Writes several options at once, so a source and its kind and size never land separately. */
  onChange: (patch: Record<string, string>) => void;
}

/**
 * The Pattern style's settings: built-in and saved patterns as swatches, one box that accepts a
 * link, a CSS snippet or SVG code (or a dropped / uploaded file), and controls that fit what was
 * chosen -- Tint for SVG patterns, Fit and Dim for photos.
 */
export function PatternStyleSettings({ options, onChange }: PatternStyleSettingsProps) {
  const saved = readSavedPatterns(options.library);
  const activeKind = options.kind ?? "dots";
  const isCustom = activeKind === "custom";
  const sourceKind: PatternSourceKind =
    options.sourcekind === "image" || (isCustom && options.sourcekind === "css") ? options.sourcekind : "svg";
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const applyCustom = async (source: PatternSource) => {
    setBusy(true);
    try {
      // CSS patterns have no image to probe; anything else is loaded first to prove the link works.
      const size = source.kind === "css" ? { width: 0, height: 0 } : await loadImageSize(source.url);
      const width = source.width ?? (size.width > 0 ? size.width : undefined);
      const resolved: PatternSource = width ? { ...source, width } : source;
      const patch: Record<string, string> = {
        kind: "custom",
        source: resolved.url,
        css: resolved.css ?? "",
        sourcekind: resolved.kind,
        sourcewidth: width ? String(width) : "",
        library: JSON.stringify(rememberPattern(saved, resolved)),
      };
      if (resolved.kind !== sourceKind || !isCustom) Object.assign(patch, KIND_DEFAULTS[resolved.kind]);
      onChange(patch);
      setStatus({ tone: "info", text: describe(resolved, size) });
      setDraft("");
    } catch {
      setStatus({ tone: "error", text: "That image couldn't be loaded. Check the link, or upload the file instead." });
    } finally {
      setBusy(false);
    }
  };

  /** Uploads an SVG too large to keep in preferences, then uses it like any other SVG. */
  const uploadSvg = async (markup: string, width: number | undefined) => {
    setBusy(true);
    try {
      const file = new File([markup], "pattern.svg", { type: "image/svg+xml" });
      const { path } = await system.uploadBackground(file);
      await applyCustom(width ? { url: path, kind: "svg", width } : { url: path, kind: "svg" });
    } catch (error) {
      setStatus({ tone: "error", text: `Upload failed: ${error instanceof Error ? error.message : String(error)}` });
      setBusy(false);
    }
  };

  const applyParsed = (parsed: PatternParseResult) => {
    if (parsed.ok === "upload") void uploadSvg(parsed.svg, parsed.width);
    else if (parsed.ok) void applyCustom(parsed.source);
    else setStatus({ tone: "error", text: parsed.error });
  };

  const applyText = (text: string) => applyParsed(parsePatternInput(text));

  const applyFile = async (file: File) => {
    if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
      applyParsed(parseSvgFile(await file.text()));
      return;
    }
    if (!RASTER_TYPES.has(file.type)) {
      setStatus({ tone: "error", text: "Use an SVG, PNG, JPG or WebP file." });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setStatus({ tone: "error", text: "Images must be 20 MB or smaller." });
      return;
    }
    setBusy(true);
    try {
      const { path } = await system.uploadBackground(file);
      await applyCustom({ url: path, kind: "image" });
    } catch (error) {
      setStatus({ tone: "error", text: `Upload failed: ${error instanceof Error ? error.message : String(error)}` });
      setBusy(false);
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void applyFile(file);
      return;
    }
    const text = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
    if (text) applyText(text);
  };

  const removeSaved = (key: string) =>
    onChange({ library: JSON.stringify(saved.filter((entry) => patternKey(entry) !== key)) });
  const isActiveSaved = (pattern: PatternSource) =>
    isCustom && (pattern.kind === "css" ? options.css === pattern.css : options.source === pattern.url);

  const tint = options.tint ?? "white";
  const fit = options.fit ?? "tile";

  return (
    <div
      className={`space-y-4 rounded-lg transition-shadow ${dragging ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div>
        <div className="mb-2 text-xs text-secondary">Patterns</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
          {BUILT_IN_PATTERNS.map((pattern) => (
            <Swatch
              key={pattern.id}
              source={pattern}
              label={pattern.label}
              active={activeKind === pattern.id}
              tiled
              onSelect={() => {
                onChange({
                  kind: pattern.id,
                  source: pattern.url,
                  css: "",
                  sourcekind: pattern.kind,
                  sourcewidth: pattern.width ? String(pattern.width) : "",
                  ...(pattern.kind === "svg" && sourceKind !== "svg" ? { opacity: "12", scale: "100", dim: "0" } : {}),
                  ...pattern.defaults,
                });
                setStatus(null);
              }}
            />
          ))}
          {/* Themes used to save their textures here before they were built in. */}
          {saved.filter((pattern) => !BUILT_IN_URLS.has(pattern.url)).map((pattern) => (
            <Swatch
              key={patternKey(pattern)}
              source={pattern}
              label={savedLabel(pattern)}
              active={isActiveSaved(pattern)}
              keepColors={options.keepcolors === "on"}
              onSelect={() => void applyCustom(pattern)}
              onRemove={() => removeSaved(patternKey(pattern))}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label htmlFor="pattern-custom-input" className="text-xs text-secondary">
            Add your own
          </label>
          <span className="text-[11px] text-muted">
            Find patterns at{" "}
            {PATTERN_SITES.map((site, index) => (
              <span key={site.href}>
                {index > 0 && ", "}
                <a href={site.href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {site.label}
                </a>
              </span>
            ))}
          </span>
        </div>
        <div className="flex gap-2">
          <textarea
            id="pattern-custom-input"
            rows={2}
            value={draft}
            placeholder="Paste a link, CSS (Hero Patterns, CSS Pattern…), or <svg> code — or drop a file here"
            onChange={(event) => setDraft(event.target.value)}
            onPaste={(event) => {
              const file = event.clipboardData.files[0];
              const text = event.clipboardData.getData("text/plain");
              if (file) {
                event.preventDefault();
                void applyFile(file);
              } else if (text.trim()) {
                event.preventDefault();
                setDraft(text);
                applyText(text);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                applyText(draft);
              }
            }}
            className="min-w-0 flex-1 resize-y rounded border border-border bg-input px-2 py-1.5 font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => applyText(draft)}
              className="no-glass rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Apply
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="no-glass inline-flex items-center justify-center gap-1 rounded border border-border px-3 py-1 text-xs text-secondary hover:border-accent hover:text-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void applyFile(file);
              }}
            />
          </div>
        </div>
        {status && (
          <p className={`mt-1 text-xs ${status.tone === "error" ? "text-red-400" : "text-secondary"}`} role="status">
            {status.text}
          </p>
        )}
      </div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {sourceKind === "css" ? (
          <>
            <p className="text-xs text-muted sm:col-span-2">
              CSS patterns keep their own colours. To recolour one, change its colour values before pasting.
            </p>
            <Slider
              label="Opacity"
              value={num(options.opacity, 30)}
              min={0}
              max={100}
              onChange={(v) => onChange({ opacity: v })}
            />
            {cssPatternIsScalable(options.css) && (
              <Slider
                label="Scale"
                value={num(options.scale, 100)}
                min={25}
                max={300}
                onChange={(v) => onChange({ scale: v })}
              />
            )}
          </>
        ) : sourceKind === "svg" ? (
          <>
            <Segmented
              label="Colour"
              value={options.keepcolors === "on" && isCustom ? "original" : tint}
              options={[
                { value: "white", label: "Soft white" },
                { value: "accent", label: "Accent" },
                { value: "foreground", label: "Text" },
                ...(isCustom ? [{ value: "original", label: "Original" }] : []),
              ]}
              onChange={(value) =>
                onChange(value === "original" ? { keepcolors: "on" } : { tint: value, keepcolors: "off" })
              }
            />
            <Slider
              label="Opacity"
              value={num(options.opacity, 12)}
              min={0}
              max={100}
              onChange={(v) => onChange({ opacity: v })}
            />
            <Slider
              label="Scale"
              value={num(options.scale, 100)}
              min={25}
              max={300}
              onChange={(v) => onChange({ scale: v })}
            />
          </>
        ) : (
          <>
            <Segmented
              label="Fit"
              value={fit}
              options={[
                { value: "tile", label: "Tile" },
                { value: "cover", label: "Fill screen" },
                { value: "center", label: "Center" },
              ]}
              onChange={(value) => onChange({ fit: value })}
            />
            <Slider
              label="Opacity"
              value={num(options.opacity, 60)}
              min={0}
              max={100}
              onChange={(v) => onChange({ opacity: v })}
            />
            <Slider label="Dim" value={num(options.dim, 0)} min={0} max={90} onChange={(v) => onChange({ dim: v })} />
            {fit !== "cover" && (
              <Slider
                label="Scale"
                value={num(options.scale, 100)}
                min={10}
                max={300}
                onChange={(v) => onChange({ scale: v })}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Swatch({
  source,
  label,
  active,
  keepColors = false,
  tiled = false,
  onSelect,
  onRemove,
}: {
  source: PatternSource;
  label: string;
  active: boolean;
  keepColors?: boolean;
  /** Preview an image as repeating tiles rather than one cover photo. */
  tiled?: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  const tile = `${Math.min(source.width ?? 24, 40)}px auto`;
  const preview: CSSProperties =
    source.kind === "css"
      ? // Shrunk so a few repeats fit in the swatch.
        ({ ...cssPatternStyle(source.css ?? ""), "--sv-pattern-scale": "40" } as CSSProperties)
      : source.kind === "image"
        ? {
            backgroundImage: patternCssImage(source.url),
            backgroundSize: tiled ? tile : "cover",
            backgroundPosition: "center",
          }
        : keepColors && onRemove
          ? { backgroundImage: patternCssImage(source.url), backgroundSize: tile }
          : {
              backgroundColor: "var(--color-foreground)",
              opacity: 0.55,
              maskImage: patternCssImage(source.url),
              WebkitMaskImage: patternCssImage(source.url),
              maskSize: tile,
              WebkitMaskSize: tile,
            };
  return (
    <div className="group/swatch relative">
      <button
        type="button"
        title={label}
        onClick={onSelect}
        className={`no-glass block w-full overflow-hidden rounded-lg border bg-background text-left ${
          active ? "border-accent ring-1 ring-accent" : "border-border hover:border-accent/60"
        }`}
      >
        <span className="relative block h-12">
          <span className="absolute inset-0" style={preview} />
        </span>
        <span className="block truncate border-t border-border/60 px-1.5 py-0.5 text-[10px] text-secondary">
          {label}
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          title="Remove from my patterns"
          aria-label={`Remove ${label} from my patterns`}
          onClick={onRemove}
          className="no-glass absolute -right-1.5 -top-1.5 hidden rounded-full border border-border bg-card p-0.5 text-muted hover:text-foreground group-hover/swatch:block"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <div className="mb-1 text-xs text-secondary">{label}</div>
      <div className="inline-flex flex-wrap rounded-lg border border-border p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`no-glass rounded-md px-2.5 py-1 text-xs ${
              option.value === value ? "bg-accent text-white" : "text-secondary hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs text-secondary">{label}</label>
        <span className="text-xs font-medium tabular-nums text-foreground">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        style={{ "--range-fill": `${((value - min) / Math.max(1, max - min)) * 100}%` } as CSSProperties}
        className="themed-range-input settings-range-input w-full cursor-pointer"
      />
    </div>
  );
}

function num(raw: string | undefined, fallback: number): number {
  const value = raw == null || raw === "" ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function savedLabel(source: PatternSource): string {
  if (source.kind === "css") return "CSS";
  if (source.url.startsWith("data:")) return "SVG";
  if (source.url.startsWith("/")) return source.kind === "image" ? "Upload" : "SVG";
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return source.kind === "image" ? "Image" : "SVG";
  }
}

function describe(source: PatternSource, size: { width: number; height: number }): string {
  if (source.kind === "css") {
    return cssPatternIsScalable(source.css) ? "CSS pattern" : "CSS pattern · fixed size (no --s variable to scale)";
  }
  if (source.kind === "svg") {
    return source.width ? `SVG pattern · ${source.width}px tile` : "SVG pattern";
  }
  return size.width > 0 ? `Image · ${size.width}×${size.height}` : "Image";
}

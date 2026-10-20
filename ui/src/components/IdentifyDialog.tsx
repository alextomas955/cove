import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { metadata, system } from "../api/client";
import type { MetadataServer, ScraperSummary } from "../api/types";
import { useAppConfig } from "../state/AppConfigContext";
import { Search, X, Loader2, ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  PERFORMER_GENDER_OPTIONS,
  buildAllowedGenderKeys,
  isGenderOptionChecked,
  toggleGenderOption,
} from "../utils/performerGenders";
import {
  applySavedSources,
  loadIdentifyPreferences,
  saveIdentifyPreferences,
  type FieldStrategy,
  type IdentifyPreferences,
  type IdentifySource,
} from "./identifyPreferences";

interface Props {
  open: boolean;
  onClose: () => void;
  videoIds?: number[];
}

const METADATA_FIELD_OPTIONS: { key: string; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "code", label: "Code" },
  { key: "details", label: "Details" },
  { key: "director", label: "Director" },
  { key: "date", label: "Date" },
  { key: "productionDate", label: "Production Date" },
  { key: "urls", label: "URLs" },
  { key: "studio", label: "Studio" },
  { key: "performers", label: "Performers" },
  { key: "tags", label: "Tags" },
];

function buildFieldStrategies(saved: Record<string, FieldStrategy>): Record<string, FieldStrategy> {
  return Object.fromEntries(METADATA_FIELD_OPTIONS.map((field) => [field.key, saved[field.key] ?? "merge"])) as Record<
    string,
    FieldStrategy
  >;
}

const DEFAULT_IDENTIFY_DEFAULTS = {
  createTags: true,
  createPerformers: true,
  createStudios: true,
};

function buildIdentifySources(metadataServers: MetadataServer[], scrapers: ScraperSummary[]): IdentifySource[] {
  const sources: IdentifySource[] = [];
  metadataServers.forEach((box) => {
    sources.push({
      id: `metadata-server:${box.endpoint}`,
      name: box.name || box.endpoint,
      type: "metadata-server",
      enabled: true,
    });
  });
  // URL-capable video scrapers can identify any video that already has a matching URL (no fingerprint
  // needed — the URL is the identity). Fragment/title search needs human review, so it stays in the
  // tagger, not this hands-off flow.
  scrapers
    .filter(
      (scraper) =>
        scraper.entityType.toLowerCase() === "video" &&
        scraper.supportedScrapes.some((kind) => kind.toLowerCase() === "url"),
    )
    .forEach((scraper) => {
      sources.push({
        id: `scraper:${scraper.id}`,
        name: scraper.name,
        type: "scraper",
        enabled: true,
      });
    });
  return sources;
}

// Stable fallbacks, so the reset below only sees a new list when the real data changes.
const NO_METADATA_SERVERS: MetadataServer[] = [];
const NO_SCRAPERS: ScraperSummary[] = [];

export function IdentifyDialog({ open, onClose, videoIds }: Props) {
  const queryClient = useQueryClient();
  const { config } = useAppConfig();

  const metadataServers = config?.scraping?.metadataServers ?? NO_METADATA_SERVERS;
  const identifyDefaults = config?.scraping?.identifyDefaults ?? DEFAULT_IDENTIFY_DEFAULTS;
  const { data: scrapers = NO_SCRAPERS } = useQuery({
    queryKey: ["scrapers"],
    queryFn: system.listScrapers,
    enabled: open,
  });

  // The last run's choices; re-read on every open so a run from another dialog instance is picked up.
  const [saved, setSaved] = useState<IdentifyPreferences>(loadIdentifyPreferences);
  const [sources, setSources] = useState<IdentifySource[]>(() =>
    applySavedSources(buildIdentifySources(metadataServers, []), saved.sources),
  );

  const [showOptions, setShowOptions] = useState(false);
  const [setCoverImage, setSetCoverImage] = useState(saved.setCoverImage);
  const [setOrganized, setSetOrganized] = useState(saved.markOrganized);
  const [skipMultipleMatches, setSkipMultipleMatches] = useState(saved.skipMultipleMatches);
  const [skipSingleNamePerformers, setSkipSingleNamePerformers] = useState(saved.skipSingleNamePerformers);
  const [createTags, setCreateTags] = useState(saved.createTags ?? identifyDefaults.createTags);
  const [createPerformers, setCreatePerformers] = useState(saved.createPerformers ?? identifyDefaults.createPerformers);
  const [createStudios, setCreateStudios] = useState(saved.createStudios ?? identifyDefaults.createStudios);
  const [fieldStrategies, setFieldStrategies] = useState<Record<string, FieldStrategy>>(() =>
    buildFieldStrategies(saved.fieldStrategies),
  );
  const [performerGenders, setPerformerGenders] = useState<string[]>(() => [...saved.performerGenders]);

  // Reset the sources and options to the last-used ones whenever the dialog opens or its inputs change
  // while open.
  const {
    createTags: defaultCreateTags,
    createPerformers: defaultCreatePerformers,
    createStudios: defaultCreateStudios,
  } = identifyDefaults;
  const [resetKey, setResetKey] = useState({
    open: false,
    metadataServers,
    scrapers,
    defaultCreateTags,
    defaultCreatePerformers,
    defaultCreateStudios,
  });
  if (
    resetKey.open !== open ||
    resetKey.metadataServers !== metadataServers ||
    resetKey.scrapers !== scrapers ||
    resetKey.defaultCreateTags !== defaultCreateTags ||
    resetKey.defaultCreatePerformers !== defaultCreatePerformers ||
    resetKey.defaultCreateStudios !== defaultCreateStudios
  ) {
    setResetKey({ open, metadataServers, scrapers, defaultCreateTags, defaultCreatePerformers, defaultCreateStudios });
    if (open) {
      const last = resetKey.open ? saved : loadIdentifyPreferences();
      setSaved(last);
      setSources(applySavedSources(buildIdentifySources(metadataServers, scrapers), last.sources));
      setSetCoverImage(last.setCoverImage);
      setSetOrganized(last.markOrganized);
      setSkipMultipleMatches(last.skipMultipleMatches);
      setSkipSingleNamePerformers(last.skipSingleNamePerformers);
      setCreateTags(last.createTags ?? defaultCreateTags);
      setCreatePerformers(last.createPerformers ?? defaultCreatePerformers);
      setCreateStudios(last.createStudios ?? defaultCreateStudios);
      setFieldStrategies(buildFieldStrategies(last.fieldStrategies));
      setPerformerGenders([...last.performerGenders]);
    }
  }

  const identifyMut = useMutation({
    mutationFn: () => {
      const shownIds = new Set(sources.map((s) => s.id));
      saveIdentifyPreferences({
        // Saved sources not listed right now (a scraper that failed to load) keep their state for next time.
        sources: [
          ...sources.map((s) => ({ id: s.id, enabled: s.enabled })),
          ...saved.sources.filter((s) => !shownIds.has(s.id)),
        ],
        setCoverImage,
        markOrganized: setOrganized,
        skipMultipleMatches,
        skipSingleNamePerformers,
        createTags,
        createPerformers,
        createStudios,
        fieldStrategies,
        performerGenders,
      });
      const enabledSources = sources.filter((s) => s.enabled).map((s) => s.name);
      return metadata.identify({
        sources: enabledSources.length > 0 ? enabledSources : undefined,
        videoIds,
        setCoverImage,
        markOrganized: setOrganized,
        skipMultipleMatches,
        skipSingleNamePerformers,
        createTags,
        createPerformers,
        createStudios,
        fieldStrategies,
        // Omitted while every option is checked, so a gender outside this list is kept rather than
        // filtered out by an allow-list that only knows the seven the dialog shows.
        performerGenders: buildAllowedGenderKeys(performerGenders) ? performerGenders : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      onClose();
    },
  });

  const toggleSource = (id: string) => {
    setSources(sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const moveSource = (index: number, direction: "up" | "down") => {
    const newSources = [...sources];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newSources.length) return;
    [newSources[index], newSources[target]] = [newSources[target], newSources[index]];
    setSources(newSources);
  };

  const setFieldStrategy = (key: string, strategy: FieldStrategy) => {
    setFieldStrategies((current) => ({ ...current, [key]: strategy }));
  };

  const togglePerformerGender = (gender: string) => {
    setPerformerGenders((current) => toggleGenderOption(current, gender, !isGenderOptionChecked(current, gender)));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" />
              Identify
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              {videoIds
                ? `Identifying ${videoIds.length} video${videoIds.length !== 1 ? "s" : ""}`
                : "Identifying all videos"}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Sources */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Sources (first match wins)</h3>
            <div className="space-y-1.5">
              {sources.map((source, i) => (
                <div
                  key={source.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                    source.enabled ? "bg-card border-border" : "bg-card/50 border-border/50 opacity-60"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => moveSource(i, "up")}
                      disabled={i === 0}
                      className="text-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveSource(i, "down")}
                      disabled={i === sources.length - 1}
                      className="text-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <label className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={() => toggleSource(source.id)}
                      className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{source.name}</div>
                      <div className="text-xs text-muted capitalize">{source.type.replace("-", " ")}</div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            {sources.length > 0 && !sources.some((s) => s.enabled) && (
              <p className="mt-2 text-xs text-muted">Select the sources to identify from.</p>
            )}
            {sources.length === 0 && (
              <div className="text-sm text-muted text-center py-4">
                No sources available. Configure MetadataServer endpoints in Settings &gt; Metadata Providers.
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-foreground"
            >
              {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Options
            </button>
            {showOptions && (
              <div className="mt-3 space-y-2 pl-1">
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={setCoverImage}
                    onChange={(e) => setSetCoverImage(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                  />
                  Set cover image from scraper
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={setOrganized}
                    onChange={(e) => setSetOrganized(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                  />
                  Mark identified videos as organized
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={skipMultipleMatches}
                    onChange={(e) => setSkipMultipleMatches(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                  />
                  Skip videos with multiple matches
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={skipSingleNamePerformers}
                    onChange={(e) => setSkipSingleNamePerformers(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                  />
                  Skip single-name performers
                </label>

                <div className="border-t border-border my-2 pt-2">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Field Handling</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {METADATA_FIELD_OPTIONS.map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span className="text-secondary">{field.label}</span>
                      <select
                        value={fieldStrategies[field.key] ?? "merge"}
                        onChange={(e) => setFieldStrategy(field.key, e.target.value as FieldStrategy)}
                        className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
                      >
                        <option value="ignore">Ignore</option>
                        <option value="merge">Merge</option>
                        <option value="overwrite">Overwrite</option>
                      </select>
                    </label>
                  ))}
                </div>

                <div className="border-t border-border my-2 pt-2">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Performer Genders</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PERFORMER_GENDER_OPTIONS.map((gender) => (
                    <label key={gender} className="flex items-center gap-2 text-sm text-secondary">
                      <input
                        type="checkbox"
                        checked={isGenderOptionChecked(performerGenders, gender)}
                        onChange={() => togglePerformerGender(gender)}
                        className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                      />
                      {gender}
                    </label>
                  ))}
                </div>
                {buildAllowedGenderKeys(performerGenders)?.size === 0 && (
                  <p className="mt-1 text-xs text-muted">
                    With no gender checked, performers are left as they are — none are added, and none are removed.
                  </p>
                )}

                <div className="border-t border-border my-2 pt-2">
                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Entity Creation</span>
                </div>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={createPerformers}
                    onChange={(e) => setCreatePerformers(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                  />
                  Create new performers
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={createStudios}
                    onChange={(e) => setCreateStudios(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                  />
                  Create new studios
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={createTags}
                    onChange={(e) => setCreateTags(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-accent focus:ring-0"
                  />
                  Create new tags
                </label>
                <div className="flex items-start gap-2 mt-2 p-2 bg-accent/10 border border-accent/20 rounded-lg">
                  <Info className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-secondary space-y-1">
                    <p>
                      Identified data will be merged with existing data by default. Fields that already have values
                      won't be overwritten.
                    </p>
                    <p>
                      Metadata servers match by fingerprint (duration and pHash thresholds are configured in Settings
                      &gt; Metadata Providers &gt; Identify Defaults). Scraper sources apply only to videos that already
                      have a URL the scraper recognizes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-secondary hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => identifyMut.mutate()}
            disabled={identifyMut.isPending || sources.filter((s) => s.enabled).length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {identifyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Identify
          </button>
        </div>
      </div>
    </div>
  );
}

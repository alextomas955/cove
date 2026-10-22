import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { aiRuns } from "../api/client";
import type { AiAnalysisCriterion, AiAnalysisState, TimestampCriterion } from "../api/types";
import { formatSourceKeyLabel } from "../utils/sourceKeyLabel";
import { TimestampEditor } from "./PrimitiveCriterionEditors";
import {
  AI_ANALYSIS_DATE_MODIFIERS,
  AI_ANALYSIS_STATE_OPTIONS,
  NEEDS_ANALYSIS_STATES,
  isNeedsAnalysisSelection,
  normalizeAiAnalysisStates,
} from "./aiAnalysisFilter";

const FACETS_STALE_TIME = 30_000;

const PILL_CLASS = "min-h-9 rounded-lg border px-3 py-1.5 text-sm";
const PILL_ON = "bg-accent text-white border-accent";
const PILL_OFF = "border-border text-secondary hover:text-foreground hover:border-accent/50";
const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-border bg-input px-3 py-2 text-base text-foreground focus:border-accent focus:outline-none md:text-sm";

export function aiRunFacetsQueryKey(targetType: "video" | "image", sourceKey?: string, includeModels = false) {
  return includeModels
    ? (["ai-run-facets", targetType, sourceKey ?? "", "models"] as const)
    : (["ai-run-facets", targetType] as const);
}

export function AiAnalysisEditor({
  value,
  onChange,
  targetType,
}: {
  value?: AiAnalysisCriterion;
  onChange: (v: unknown) => void;
  targetType: "video" | "image";
}) {
  const sourceSelectId = useId();
  const modelInputId = useId();
  const detailsId = useId();
  const states = normalizeAiAnalysisStates(value?.states);
  const modelKeys = value?.modelKeys ?? [];
  const modelModifier = value?.modelModifier === "EXCLUDES" ? "EXCLUDES" : "INCLUDES";
  const hasDetails = modelKeys.length > 0 || value?.analysedAtCriterion != null;
  const [detailsOpen, setDetailsOpen] = useState(hasDetails);
  const [modelDraft, setModelDraft] = useState("");

  const facets = useQuery({
    queryKey: aiRunFacetsQueryKey(targetType),
    queryFn: () => aiRuns.facets(targetType),
    staleTime: FACETS_STALE_TIME,
  });
  const sources = facets.data?.sources ?? [];
  const singleSource = sources.length === 1 ? sources[0].sourceKey : undefined;
  // With a single source the editor fixes it, so a saved filter keeps meaning that source if another appears later.
  const effectiveSourceKey = value?.sourceKey ?? singleSource;

  const showDetails = detailsOpen || hasDetails;
  const models = useQuery({
    queryKey: aiRunFacetsQueryKey(targetType, effectiveSourceKey, true),
    queryFn: () => aiRuns.facets(targetType, { sourceKey: effectiveSourceKey, includeModels: true }),
    staleTime: FACETS_STALE_TIME,
    enabled: showDetails,
  });
  const knownModels = models.data?.models ?? [];
  const modelOptions = [
    ...knownModels.map((model) => ({ key: model.key, label: model.name ? `${model.name} (${model.key})` : model.key })),
    ...modelKeys.filter((key) => !knownModels.some((model) => model.key === key)).map((key) => ({ key, label: key })),
  ];

  const commit = (patch: Partial<AiAnalysisCriterion>) => {
    const next: AiAnalysisCriterion = { ...value, ...patch };
    const sourceKey = "sourceKey" in patch ? patch.sourceKey : effectiveSourceKey;
    if (sourceKey) next.sourceKey = sourceKey;
    else delete next.sourceKey;
    if (sourceKey && sourceKey === singleSource) next._singleSource = true;
    else delete next._singleSource;
    onChange(next);
  };

  const setStates = (nextStates: AiAnalysisState[]) => commit({ states: normalizeAiAnalysisStates(nextStates) });
  const toggleState = (state: AiAnalysisState) =>
    setStates(states.includes(state) ? states.filter((item) => item !== state) : [...states, state]);
  const needsAnalysis = isNeedsAnalysisSelection(states);

  const setModelKeys = (nextKeys: string[]) =>
    commit({ modelKeys: nextKeys, modelModifier: nextKeys.length > 0 ? modelModifier : undefined });
  const addModelDraft = () => {
    const key = modelDraft.trim();
    if (!key) return;
    if (!modelKeys.includes(key)) setModelKeys([...modelKeys, key]);
    setModelDraft("");
  };

  const analysedAt: TimestampCriterion = value?.analysedAtCriterion ?? { value: "", modifier: "LESS_THAN" };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {sources.length > 1 ? (
          <>
            <label htmlFor={sourceSelectId} className="block text-sm font-medium text-secondary">
              Source
            </label>
            <select
              id={sourceSelectId}
              value={value?.sourceKey ?? ""}
              onChange={(event) => commit({ sourceKey: event.target.value || undefined })}
              className={INPUT_CLASS}
            >
              <option value="">Any source</option>
              {sources.map((source) => (
                <option key={source.sourceKey} value={source.sourceKey}>
                  {formatSourceKeyLabel(source.sourceKey)} ({source.runCount.toLocaleString()} runs)
                </option>
              ))}
            </select>
            {!value?.sourceKey && (
              <p className="text-xs text-muted">
                With any source, the most recent run across all sources decides the status.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="text-sm font-medium text-secondary">Source</div>
            <div className="flex min-h-9 items-center text-sm text-foreground" data-testid="ai-analysis-source">
              {facets.isPending
                ? "Loading sources…"
                : effectiveSourceKey
                  ? formatSourceKeyLabel(effectiveSourceKey)
                  : facets.isError
                    ? "Sources are unavailable"
                    : "No AI runs recorded yet"}
            </div>
          </>
        )}
      </div>

      <div className="space-y-2" role="group" aria-label="Analysis status">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-secondary">Status</div>
          <button
            type="button"
            aria-pressed={needsAnalysis}
            onClick={() => setStates(needsAnalysis ? [] : [...NEEDS_ANALYSIS_STATES])}
            title="Never run or cancelled. Failed runs are a separate choice."
            className={`rounded-lg border px-2.5 py-1 text-xs ${needsAnalysis ? PILL_ON : PILL_OFF}`}
          >
            Needs analysis
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {AI_ANALYSIS_STATE_OPTIONS.map((option) => {
            const selected = states.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleState(option.value)}
                className={`${PILL_CLASS} ${selected ? PILL_ON : PILL_OFF}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          Based on each item&apos;s most recent run. Needs analysis selects never run and cancelled; failed runs stay a
          separate choice.
        </p>
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <button
          type="button"
          aria-expanded={showDetails}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen(!showDetails)}
          disabled={hasDetails}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-foreground disabled:cursor-default disabled:hover:text-secondary"
        >
          {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Model and date
        </button>
        {showDetails && (
          <div id={detailsId} className="space-y-4">
            <div className="space-y-2" role="group" aria-label="Model">
              <div className="text-sm font-medium text-secondary">Model</div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["INCLUDES", "Used"],
                    ["EXCLUDES", "Not used"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={modelModifier === mode}
                    onClick={() => commit({ modelModifier: mode })}
                    className={`${PILL_CLASS} ${modelModifier === mode ? PILL_ON : PILL_OFF}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {modelOptions.length > 0 ? (
                <div className="grid gap-1 sm:grid-cols-2">
                  {modelOptions.map((option) => (
                    <label
                      key={option.key}
                      className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={modelKeys.includes(option.key)}
                        onChange={() =>
                          setModelKeys(
                            modelKeys.includes(option.key)
                              ? modelKeys.filter((key) => key !== option.key)
                              : [...modelKeys, option.key],
                          )
                        }
                        className="h-5 w-5 accent-accent"
                      />
                      <span className="min-w-0 break-words">{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  {models.isPending ? "Loading models…" : "No models recorded for completed runs."}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  id={modelInputId}
                  type="text"
                  value={modelDraft}
                  onChange={(event) => setModelDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addModelDraft();
                    }
                  }}
                  placeholder="Other model key"
                  aria-label="Other model key"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={addModelDraft}
                  disabled={!modelDraft.trim()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-sm text-secondary hover:border-accent/60 hover:text-foreground disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <p className="text-xs text-muted">
                {modelModifier === "EXCLUDES"
                  ? "Not used also matches items that were never analysed."
                  : "Matches items with any completed run that used a selected model."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-secondary">Last analysed</div>
              <TimestampEditor
                value={analysedAt}
                onChange={(next) => commit({ analysedAtCriterion: next as TimestampCriterion })}
                modifiers={AI_ANALYSIS_DATE_MODIFIERS}
                modifierLabels={{ LESS_THAN: "Before", GREATER_THAN: "After", IS_NULL: "Never completed" }}
              />
              {value?.analysedAtCriterion && (
                <button
                  type="button"
                  onClick={() => commit({ analysedAtCriterion: undefined })}
                  className="text-xs text-secondary underline-offset-2 hover:text-foreground hover:underline"
                >
                  Clear date
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

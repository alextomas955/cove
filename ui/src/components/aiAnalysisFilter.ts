import type { AiAnalysisCriterion, AiAnalysisState, CriterionModifier, TimestampCriterion } from "../api/types";
import { describeRelativeDate, isValidRelativeDate, looksLikeRelativeDate } from "../utils/relativeDate";
import { formatSourceKeyLabel } from "../utils/sourceKeyLabel";

/** State pills in display order, with the wording used by the editor and in summaries. */
export const AI_ANALYSIS_STATE_OPTIONS: ReadonlyArray<{ value: AiAnalysisState; label: string; summary: string }> = [
  { value: "neverRun", label: "Never run", summary: "never run" },
  { value: "failed", label: "Latest failed", summary: "latest failed" },
  { value: "inProgress", label: "In progress", summary: "in progress" },
  { value: "completed", label: "Latest completed", summary: "latest completed" },
  { value: "cancelled", label: "Latest cancelled", summary: "latest cancelled" },
];

/**
 * "Needs analysis": never run, or the latest run was cancelled. A failed run is left out on purpose: a failure usually
 * repeats until something changes, so retrying failures stays its own explicit choice.
 */
export const NEEDS_ANALYSIS_STATES: readonly AiAnalysisState[] = ["neverRun", "cancelled"];

export const AI_ANALYSIS_DATE_MODIFIERS: CriterionModifier[] = ["LESS_THAN", "GREATER_THAN", "BETWEEN", "IS_NULL"];

const STATE_ORDER = new Map(AI_ANALYSIS_STATE_OPTIONS.map((option, index) => [option.value, index]));

export function normalizeAiAnalysisStates(states: unknown): AiAnalysisState[] {
  if (!Array.isArray(states)) return [];
  return [...new Set(states.filter((state): state is AiAnalysisState => STATE_ORDER.has(state)))].sort(
    (left, right) => STATE_ORDER.get(left)! - STATE_ORDER.get(right)!,
  );
}

export function isNeedsAnalysisSelection(states: readonly AiAnalysisState[]) {
  return (
    states.length === NEEDS_ANALYSIS_STATES.length && NEEDS_ANALYSIS_STATES.every((state) => states.includes(state))
  );
}

function normalizeModelKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys.filter((key): key is string => typeof key === "string").map((key) => key.trim()))].filter(
    Boolean,
  );
}

function isAnalysedAtValid(criterion: TimestampCriterion | undefined) {
  if (!criterion || typeof criterion !== "object") return false;
  const modifier = criterion.modifier ?? "EQUALS";
  if (modifier === "IS_NULL" || modifier === "NOT_NULL") return true;
  const isValidBound = (bound: unknown) =>
    typeof bound === "string" &&
    bound.trim() !== "" &&
    (!looksLikeRelativeDate(bound) || isValidRelativeDate(bound, true));
  if (!isValidBound(criterion.value)) return false;
  return modifier !== "BETWEEN" && modifier !== "NOT_BETWEEN" ? true : isValidBound(criterion.value2);
}

/** The criterion as the server should receive it, or undefined when it would test nothing. */
export function sanitizeAiAnalysisCriterion(value: unknown): AiAnalysisCriterion | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as AiAnalysisCriterion;
  const states = normalizeAiAnalysisStates(raw.states);
  const modelKeys = normalizeModelKeys(raw.modelKeys);
  const analysedAtCriterion = isAnalysedAtValid(raw.analysedAtCriterion) ? raw.analysedAtCriterion : undefined;
  if (states.length === 0 && modelKeys.length === 0 && !analysedAtCriterion) return undefined;

  const sourceKey = typeof raw.sourceKey === "string" && raw.sourceKey.trim() ? raw.sourceKey.trim() : undefined;
  return {
    ...(sourceKey ? { sourceKey } : {}),
    ...(states.length > 0 ? { states } : {}),
    ...(modelKeys.length > 0
      ? { modelKeys, modelModifier: raw.modelModifier === "EXCLUDES" ? "EXCLUDES" : "INCLUDES" }
      : {}),
    ...(analysedAtCriterion ? { analysedAtCriterion } : {}),
    ...(sourceKey && raw._singleSource ? { _singleSource: true } : {}),
  };
}

export function isAiAnalysisCriterionValid(value: unknown) {
  return sanitizeAiAnalysisCriterion(value) !== undefined;
}

function formatTimestampValue(value: string | undefined) {
  if (!value) return "";
  return describeRelativeDate(value, false) ?? value.replace("T", " ");
}

function formatAnalysedAt(criterion: TimestampCriterion) {
  const first = formatTimestampValue(criterion.value);
  switch (criterion.modifier) {
    case "IS_NULL":
      return "never completed";
    case "NOT_NULL":
      return "completed at least once";
    case "LESS_THAN":
      return `last analysed before ${first}`;
    case "GREATER_THAN":
      return `last analysed after ${first}`;
    case "BETWEEN":
      return `last analysed between ${first} and ${formatTimestampValue(criterion.value2)}`;
    case "NOT_BETWEEN":
      return `last analysed outside ${first} to ${formatTimestampValue(criterion.value2)}`;
    case "NOT_EQUALS":
      return `last analysed not at ${first}`;
    default:
      return `last analysed at ${first}`;
  }
}

function joinOr(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} or ${values.at(-1)}`;
}

/**
 * Plain-language summary for chips and explanations, such as "never run or latest failed" or
 * "AI Core · needs analysis · without model clip_v1". The source is left out when it was the only one.
 */
export function formatAiAnalysisSummary(value: unknown, modelLabels?: ReadonlyMap<string, string>): string {
  const criterion = sanitizeAiAnalysisCriterion(value);
  if (!criterion) return "not set";
  const parts: string[] = [];
  if (criterion.sourceKey && !criterion._singleSource) parts.push(formatSourceKeyLabel(criterion.sourceKey));

  const states = criterion.states ?? [];
  if (isNeedsAnalysisSelection(states)) parts.push("needs analysis");
  else if (states.length > 0)
    parts.push(joinOr(states.map((state) => AI_ANALYSIS_STATE_OPTIONS.find((o) => o.value === state)!.summary)));

  const models = (criterion.modelKeys ?? []).map((key) => modelLabels?.get(key) ?? key);
  if (models.length > 0) {
    const noun = models.length === 1 ? "model" : "models";
    parts.push(
      criterion.modelModifier === "EXCLUDES" ? `without ${noun} ${joinOr(models)}` : `with ${noun} ${joinOr(models)}`,
    );
  }

  if (criterion.analysedAtCriterion) parts.push(formatAnalysedAt(criterion.analysedAtCriterion));
  return parts.join(" · ");
}

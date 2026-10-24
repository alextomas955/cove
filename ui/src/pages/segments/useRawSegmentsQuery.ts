import { useQuery } from "@tanstack/react-query";
import { segmentLibrary } from "../../api/client";
import type {
  BoolCriterion,
  IntCriterion,
  SegmentFilterCriteria,
  SegmentFilteredQueryRequest,
  StringCriterion,
  TimestampCriterion,
} from "../../api/types";
import type { RawSegmentItem } from "./types";
import type {
  RawSegmentFilterValue,
  SegmentNumberCriterionValue,
  SegmentStringCriterionValue,
  SegmentTimestampCriterionValue,
} from "./rawSegmentFilter";

interface UseRawSegmentsQueryOptions {
  pageNumber: number;
  perPage: number;
  q: string;
  videoTitle: string;
  videoTagIds: number[];
  videoTagDepth?: -1;
  sort: string;
  direction: "asc" | "desc";
  seed?: number;
  includeVideoIds: number[];
  excludeVideoIds: number[];
  rawSegmentIds: number[];
  rawFilter: RawSegmentFilterValue;
  enabled: boolean;
  includeAggregate?: boolean;
}

type RawSegmentListOptions = NonNullable<Parameters<typeof segmentLibrary.list>[0]>;

export function buildRawSegmentListOptions({
  pageNumber,
  perPage,
  q,
  videoTitle,
  videoTagIds,
  videoTagDepth,
  sort,
  direction,
  seed,
  includeVideoIds,
  excludeVideoIds,
  rawSegmentIds,
  rawFilter,
  includeAggregate = false,
}: Omit<UseRawSegmentsQueryOptions, "enabled">): RawSegmentListOptions {
  return {
    q: q || undefined,
    ids: rawSegmentIds.length > 0 ? rawSegmentIds.join(",") : undefined,
    videoIds: includeVideoIds.length > 0 ? includeVideoIds.join(",") : undefined,
    excludeVideoIds: excludeVideoIds.length > 0 ? excludeVideoIds.join(",") : undefined,
    videoTitle: videoTitle || undefined,
    videoTagIds: videoTagIds.length > 0 ? videoTagIds.join(",") : undefined,
    videoTagDepth,
    tagIds: rawFilter.tagIds.length > 0 ? rawFilter.tagIds.join(",") : undefined,
    tagDepth: rawFilter.tagDepth,
    kind: rawFilter.kind,
    sourceKey: rawFilter.sourceKey,
    sourceCategory: rawFilter.sourceCategory,
    title: rawFilter.titleCriterion?.value,
    titleModifier: rawFilter.titleCriterion?.modifier,
    hostType: rawFilter.hostType,
    sourceRunId: rawFilter.sourceRunCriterion?.value,
    sourceRunIdModifier: rawFilter.sourceRunCriterion?.modifier,
    colorHint: rawFilter.colorHintCriterion?.value,
    colorHintModifier: rawFilter.colorHintCriterion?.modifier,
    hasImage: rawFilter.hasImage,
    hasPayload: rawFilter.hasPayload,
    startSec: rawFilter.startSecCriterion?.value,
    startSec2: rawFilter.startSecCriterion?.value2,
    startSecModifier: rawFilter.startSecCriterion?.modifier,
    endSec: rawFilter.endSecCriterion?.value,
    endSec2: rawFilter.endSecCriterion?.value2,
    endSecModifier: rawFilter.endSecCriterion?.modifier,
    createdAt: rawFilter.createdAtCriterion?.value,
    createdAt2: rawFilter.createdAtCriterion?.value2,
    createdAtModifier: rawFilter.createdAtCriterion?.modifier,
    updatedAt: rawFilter.updatedAtCriterion?.value,
    updatedAt2: rawFilter.updatedAtCriterion?.value2,
    updatedAtModifier: rawFilter.updatedAtCriterion?.modifier,
    refIds: rawFilter.faceIds.length > 0 ? rawFilter.faceIds.join(",") : undefined,
    performerIds: rawFilter.performerIds.length > 0 ? rawFilter.performerIds.join(",") : undefined,
    minConfidence: rawFilter.minConfidence,
    minDurationSec: rawFilter.minDurationSec,
    confidence: rawFilter.confidenceCriterion?.value,
    confidence2: rawFilter.confidenceCriterion?.value2,
    confidenceModifier: rawFilter.confidenceCriterion?.modifier,
    durationSec: rawFilter.durationCriterion?.value,
    durationSec2: rawFilter.durationCriterion?.value2,
    durationModifier: rawFilter.durationCriterion?.modifier,
    sort,
    direction,
    seed,
    page: pageNumber,
    perPage,
    includeAggregate,
  };
}

function idsOrUndefined(ids: number[] | undefined) {
  return ids && ids.length > 0 ? ids : undefined;
}

function includesCriterion(value: string | undefined): StringCriterion | undefined {
  const text = value?.trim();
  return text ? { value: text, modifier: "INCLUDES" } : undefined;
}

// A text criterion only filters with a modifier, as the flat `title`/`titleModifier` pair always did.
function stringCriterion(value: SegmentStringCriterionValue | undefined): StringCriterion | undefined {
  if (!value?.modifier) return undefined;
  return { value: value.value ?? "", modifier: value.modifier };
}

// Number and timestamp parameters without a modifier have always meant "greater than".
function numberCriterion(value: SegmentNumberCriterionValue | undefined): IntCriterion | undefined {
  if (value?.value == null) return undefined;
  return { value: value.value, value2: value.value2, modifier: value.modifier ?? "GREATER_THAN" };
}

function timestampCriterion(value: SegmentTimestampCriterionValue | undefined): TimestampCriterion | undefined {
  if (!value?.value) return undefined;
  return { value: value.value, value2: value.value2, modifier: value.modifier ?? "GREATER_THAN" };
}

function boolCriterion(value: boolean | undefined): BoolCriterion | undefined {
  return value == null ? undefined : { value };
}

/**
 * The same inputs as `buildRawSegmentListOptions`, as the body `POST /api/segments/find` and
 * `/aggregate` take: the filter as a `SegmentFilterCriteria` and the search, sort, seed and paging as a
 * `FindFilter`. Extensions that list segments build their request with this so their filters mean
 * exactly what the Segments page's do.
 */
export function buildSegmentFilteredQuery({
  pageNumber,
  perPage,
  q,
  videoTitle,
  videoTagIds,
  videoTagDepth,
  sort,
  direction,
  seed,
  includeVideoIds,
  excludeVideoIds,
  rawSegmentIds,
  rawFilter,
}: Omit<UseRawSegmentsQueryOptions, "enabled" | "includeAggregate">): SegmentFilteredQueryRequest {
  const objectFilter: SegmentFilterCriteria = {
    ids: idsOrUndefined(rawSegmentIds),
    videoIds: idsOrUndefined(includeVideoIds),
    excludeVideoIds: idsOrUndefined(excludeVideoIds),
    videoTitleCriterion: includesCriterion(videoTitle),
    videoTagIds: idsOrUndefined(videoTagIds),
    videoTagDepth,
    tagIds: idsOrUndefined(rawFilter.tagIds),
    tagDepth: rawFilter.tagDepth,
    kindCriterion: includesCriterion(rawFilter.kind),
    sourceKeyCriterion: includesCriterion(rawFilter.sourceKey),
    sourceCategory: rawFilter.sourceCategory,
    hostType: rawFilter.hostType === "video" ? "video" : undefined,
    titleCriterion: stringCriterion(rawFilter.titleCriterion),
    sourceRunIdCriterion: stringCriterion(rawFilter.sourceRunCriterion),
    colorHintCriterion: stringCriterion(rawFilter.colorHintCriterion),
    hasImageCriterion: boolCriterion(rawFilter.hasImage),
    hasPayloadCriterion: boolCriterion(rawFilter.hasPayload),
    startSecCriterion: numberCriterion(rawFilter.startSecCriterion),
    endSecCriterion: numberCriterion(rawFilter.endSecCriterion),
    createdAtCriterion: timestampCriterion(rawFilter.createdAtCriterion),
    updatedAtCriterion: timestampCriterion(rawFilter.updatedAtCriterion),
    // Face ids ride on the segment's ref; the library only matches them for face segments.
    refIds: idsOrUndefined(rawFilter.faceIds),
    performerIds: idsOrUndefined(rawFilter.performerIds),
    minConfidence: rawFilter.minConfidence,
    minDurationSec: rawFilter.minDurationSec,
    confidenceCriterion: numberCriterion(rawFilter.confidenceCriterion),
    durationCriterion: numberCriterion(rawFilter.durationCriterion),
  };

  return {
    objectFilter,
    findFilter: {
      q: q || undefined,
      page: pageNumber,
      perPage,
      sort,
      direction,
      seed,
    },
  };
}

export function useRawSegmentsQuery({
  pageNumber,
  perPage,
  q,
  videoTitle,
  videoTagIds,
  videoTagDepth,
  sort,
  direction,
  seed,
  includeVideoIds,
  excludeVideoIds,
  rawSegmentIds,
  rawFilter,
  enabled,
  includeAggregate = false,
}: UseRawSegmentsQueryOptions) {
  return useQuery({
    queryKey: [
      "segments-page",
      "raw",
      pageNumber,
      perPage,
      q,
      videoTitle,
      videoTagIds.join(","),
      videoTagDepth,
      sort,
      direction,
      seed,
      includeVideoIds.join(","),
      excludeVideoIds.join(","),
      rawSegmentIds.join(","),
      rawFilter,
      includeAggregate,
    ],
    queryFn: async (): Promise<{ items: RawSegmentItem[]; totalCount: number; duration: number }> => {
      const request = buildSegmentFilteredQuery({
        pageNumber,
        perPage,
        q,
        videoTitle,
        videoTagIds,
        videoTagDepth,
        sort,
        direction,
        seed,
        includeVideoIds,
        excludeVideoIds,
        rawSegmentIds,
        rawFilter,
      });
      // The aggregate carries the count as well, so a summary-only query must not also run the page
      // query: on a large library each is a full scan of the matching segments.
      if (includeAggregate) {
        const aggregate = await segmentLibrary.aggregate(request);
        return { items: [], totalCount: aggregate.count, duration: aggregate.duration };
      }
      const response = await segmentLibrary.findFiltered(request);

      return {
        items: response.items.map((item) => ({
          ...item,
          key: `segment:${item.id}`,
          videoId: item.hostId,
          videoTitle: item.hostTitle?.trim() || `Video #${item.hostId}`,
        })),
        totalCount: response.totalCount,
        duration: 0,
      };
    },
    enabled,
    staleTime: 15_000,
  });
}

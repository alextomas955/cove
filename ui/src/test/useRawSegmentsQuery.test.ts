import { describe, expect, it } from "vitest";
import { buildRawSegmentListOptions, buildSegmentFilteredQuery } from "../pages/segments/useRawSegmentsQuery";
import type { RawSegmentFilterValue } from "../pages/segments/rawSegmentFilter";

describe("buildRawSegmentListOptions", () => {
  it("forwards raw segment advanced filters", () => {
    const rawFilter: RawSegmentFilterValue = {
      sourceCategory: "extensions",
      sourceKey: "ext:ai.actions",
      kind: "action",
      tagIds: [1, 2],
      performerIds: [3],
      faceIds: [4],
      minConfidence: 0.25,
      minDurationSec: 2,
      titleCriterion: { value: "needle", modifier: "INCLUDES" },
      hostType: "video",
      sourceRunCriterion: { value: "run-1", modifier: "EQUALS" },
      colorHintCriterion: { value: "#123456", modifier: "EQUALS" },
      hasImage: true,
      hasPayload: false,
      createdAtCriterion: { value: "2024-01-01T00:00:00Z", value2: "2024-01-02T00:00:00Z", modifier: "BETWEEN" },
      updatedAtCriterion: { value: "2024-02-01T00:00:00Z", modifier: "GREATER_THAN" },
      startSecCriterion: { value: 10, value2: 20, modifier: "BETWEEN" },
      endSecCriterion: { value: 30, modifier: "LESS_THAN" },
      confidenceCriterion: { value: 0.75, modifier: "GREATER_THAN" },
      durationCriterion: { value: 5, value2: 10, modifier: "BETWEEN" },
    };

    const options = buildRawSegmentListOptions({
      pageNumber: 2,
      perPage: 24,
      q: "search",
      videoTitle: "video",
      videoTagIds: [20, 21],
      videoTagDepth: -1,
      sort: "updated_at",
      direction: "asc",
      seed: 2468,
      includeVideoIds: [10, 11],
      excludeVideoIds: [12],
      rawSegmentIds: [100, 101],
      rawFilter,
    });

    expect(options.includeAggregate).toBe(false);
    expect(options).toMatchObject({
      q: "search",
      ids: "100,101",
      videoIds: "10,11",
      excludeVideoIds: "12",
      videoTitle: "video",
      videoTagIds: "20,21",
      videoTagDepth: -1,
      tagIds: "1,2",
      kind: "action",
      sourceKey: "ext:ai.actions",
      sourceCategory: "extensions",
      title: "needle",
      titleModifier: "INCLUDES",
      hostType: "video",
      sourceRunId: "run-1",
      sourceRunIdModifier: "EQUALS",
      colorHint: "#123456",
      colorHintModifier: "EQUALS",
      hasImage: true,
      hasPayload: false,
      startSec: 10,
      startSec2: 20,
      startSecModifier: "BETWEEN",
      endSec: 30,
      endSecModifier: "LESS_THAN",
      createdAt: "2024-01-01T00:00:00Z",
      createdAt2: "2024-01-02T00:00:00Z",
      createdAtModifier: "BETWEEN",
      updatedAt: "2024-02-01T00:00:00Z",
      updatedAtModifier: "GREATER_THAN",
      refIds: "4",
      performerIds: "3",
      minConfidence: 0.25,
      minDurationSec: 2,
      confidence: 0.75,
      confidenceModifier: "GREATER_THAN",
      durationSec: 5,
      durationSec2: 10,
      durationModifier: "BETWEEN",
      sort: "updated_at",
      direction: "asc",
      seed: 2468,
      page: 2,
      perPage: 24,
    });

    expect(
      buildRawSegmentListOptions({
        pageNumber: 1,
        perPage: 1,
        q: "",
        videoTitle: "",
        videoTagIds: [],
        sort: "updated_at",
        direction: "desc",
        includeVideoIds: [],
        excludeVideoIds: [],
        rawSegmentIds: [],
        rawFilter,
        includeAggregate: true,
      }).includeAggregate,
    ).toBe(true);
  });
});

describe("buildSegmentFilteredQuery", () => {
  const rawFilter: RawSegmentFilterValue = {
    sourceCategory: "extensions",
    sourceKey: "ext:ai.actions",
    kind: "action",
    tagIds: [1, 2],
    performerIds: [3],
    faceIds: [4],
    minConfidence: 0.25,
    minDurationSec: 2,
    titleCriterion: { value: "needle", modifier: "INCLUDES" },
    hostType: "video",
    sourceRunCriterion: { value: "run-1", modifier: "EQUALS" },
    colorHintCriterion: { value: "#123456" },
    hasImage: true,
    hasPayload: false,
    createdAtCriterion: { value: "2024-01-01T00:00:00Z", value2: "2024-01-02T00:00:00Z", modifier: "BETWEEN" },
    updatedAtCriterion: { value: "-7d" },
    startSecCriterion: { value: 10, value2: 20, modifier: "BETWEEN" },
    endSecCriterion: { value: 30, modifier: "LESS_THAN" },
    confidenceCriterion: { value: 0.75 },
    durationCriterion: { value: 5, value2: 10, modifier: "BETWEEN" },
  };

  it("maps the segments page filter onto the SegmentFilter body the find endpoint takes", () => {
    const request = buildSegmentFilteredQuery({
      pageNumber: 2,
      perPage: 24,
      q: "search",
      videoTitle: "video",
      videoTagIds: [20, 21],
      videoTagDepth: -1,
      sort: "updated_at",
      direction: "asc",
      seed: 2468,
      includeVideoIds: [10, 11],
      excludeVideoIds: [12],
      rawSegmentIds: [100, 101],
      rawFilter,
    });

    expect(request.findFilter).toEqual({
      q: "search",
      page: 2,
      perPage: 24,
      sort: "updated_at",
      direction: "asc",
      seed: 2468,
    });
    expect(request.objectFilter).toEqual({
      ids: [100, 101],
      videoIds: [10, 11],
      excludeVideoIds: [12],
      videoTitleCriterion: { value: "video", modifier: "INCLUDES" },
      videoTagIds: [20, 21],
      videoTagDepth: -1,
      tagIds: [1, 2],
      tagDepth: undefined,
      kindCriterion: { value: "action", modifier: "INCLUDES" },
      sourceKeyCriterion: { value: "ext:ai.actions", modifier: "INCLUDES" },
      sourceCategory: "extensions",
      hostType: "video",
      titleCriterion: { value: "needle", modifier: "INCLUDES" },
      sourceRunIdCriterion: { value: "run-1", modifier: "EQUALS" },
      // A text criterion without a modifier never filtered; it still does not.
      colorHintCriterion: undefined,
      hasImageCriterion: { value: true },
      hasPayloadCriterion: { value: false },
      startSecCriterion: { value: 10, value2: 20, modifier: "BETWEEN" },
      endSecCriterion: { value: 30, value2: undefined, modifier: "LESS_THAN" },
      createdAtCriterion: { value: "2024-01-01T00:00:00Z", value2: "2024-01-02T00:00:00Z", modifier: "BETWEEN" },
      // Numbers and timestamps without a modifier have always meant "greater than".
      updatedAtCriterion: { value: "-7d", value2: undefined, modifier: "GREATER_THAN" },
      refIds: [4],
      performerIds: [3],
      minConfidence: 0.25,
      minDurationSec: 2,
      confidenceCriterion: { value: 0.75, value2: undefined, modifier: "GREATER_THAN" },
      durationCriterion: { value: 5, value2: 10, modifier: "BETWEEN" },
    });
  });

  it("leaves empty scoping fields out so the server sees an unfiltered list", () => {
    const request = buildSegmentFilteredQuery({
      pageNumber: 1,
      perPage: 48,
      q: "",
      videoTitle: "",
      videoTagIds: [],
      sort: "random",
      direction: "desc",
      seed: 7,
      includeVideoIds: [],
      excludeVideoIds: [],
      rawSegmentIds: [],
      rawFilter: { tagIds: [], performerIds: [], faceIds: [] },
    });

    expect(request.findFilter).toEqual({
      q: undefined,
      page: 1,
      perPage: 48,
      sort: "random",
      direction: "desc",
      seed: 7,
    });
    expect(Object.values(request.objectFilter ?? {}).every((value) => value === undefined)).toBe(true);
  });
});

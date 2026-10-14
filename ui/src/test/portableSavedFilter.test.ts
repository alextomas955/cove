import { describe, expect, it } from "vitest";
import { VIDEO_CRITERIA } from "../components/filterCriteriaCatalogs";
import type { CriterionDefinition } from "../components/filterCriteriaTypes";
import { extensionFilterKey } from "../extensions/extensionListFilters";
import {
  buildPortableSavedFilter,
  collectEntityIdReferences,
  entityReferenceKey,
  inspectPortableObjectFilter,
  parsePortableSavedFilter,
  PORTABLE_SAVED_FILTER_FORMAT,
  portableReferenceKey,
  resolvePortableObjectFilter,
  toPortableObjectFilter,
  type PortableEntityReference,
  type ResolvedEntityReference,
} from "../utils/portableSavedFilter";

const criteria = VIDEO_CRITERIA as CriterionDefinition[];
const stashBox = "https://stash-box.example/graphql";

const references = new Map<string, PortableEntityReference>([
  [
    entityReferenceKey("tags", 5),
    { $ref: "tags", name: "Outdoor", remoteIds: [{ endpoint: stashBox, remoteId: "t-5" }] },
  ],
  [entityReferenceKey("tags", 6), { $ref: "tags", name: "Long take" }],
  [entityReferenceKey("performers", 12), { $ref: "performers", name: "Performer A", disambiguation: "II" }],
  [entityReferenceKey("studios", 3), { $ref: "studios", name: "Studio North" }],
  [entityReferenceKey("videos", 70), { $ref: "videos", name: "Video Seventy" }],
]);
const ref = (key: string) => references.get(key)!;

const outdoor = ref("tags:5");
const longTake = ref("tags:6");
const performer = ref("performers:12");
const local = new Map<string, ResolvedEntityReference>([
  [portableReferenceKey(outdoor), { id: 501, name: "Outdoor" }],
  [portableReferenceKey(performer), { id: 712, name: "Performer A" }],
]);
const resolveLocally = (filter: Record<string, unknown>) =>
  resolvePortableObjectFilter(
    filter,
    criteria,
    "videos",
    (reference) => local.get(portableReferenceKey(reference)) ?? null,
  );

describe("portable saved filters: export", () => {
  it("finds entity IDs in plain, related, expression, tag-duration, custom-field and worklist criteria", () => {
    const objectFilter = {
      tagsCriterion: { value: [5], excludes: ["6"], modifier: "INCLUDES", _names: { "5": "Outdoor" } },
      performerFilterCriterion: {
        objectFilter: { tagsCriterion: { value: [6], modifier: "INCLUDES" } },
        performerIdsCriterion: { value: [12], modifier: "INCLUDES" },
      },
      _filterExpression: {
        operator: "OR",
        children: [{ filter: { studiosCriterion: { value: [3], modifier: "INCLUDES" } } }],
      },
      tagDurationCriterion: { clauses: [{ tagId: 5, modifier: "GREATER_THAN", value: 30 }] },
      customFieldCriteria: [{ key: "lead", type: "performer", value: "12", modifier: "EQUALS" }],
      ids: [70],
      ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
    };

    const found = collectEntityIdReferences(objectFilter, criteria, "videos").map(({ entityType, id }) =>
      entityReferenceKey(entityType, id),
    );
    expect(found.sort()).toEqual(["performers:12", "studios:3", "tags:5", "tags:6", "videos:70"]);
  });

  it("replaces IDs with references and drops local name hints", () => {
    const { objectFilter, omitted } = toPortableObjectFilter(
      {
        tagsCriterion: { value: [5], excludes: [6], modifier: "INCLUDES_ALL", depth: -1, _names: { "5": "Outdoor" } },
        customFieldCriteria: [
          { key: "lead", type: "performer", value: "12", displayValue: "Performer A", modifier: "EQUALS" },
        ],
        studioId: 3,
        ids: [70],
        ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
      },
      criteria,
      "videos",
      references,
    );

    expect(omitted).toEqual([]);
    expect(objectFilter).toEqual({
      tagsCriterion: { value: [outdoor], excludes: [longTake], modifier: "INCLUDES_ALL", depth: -1 },
      customFieldCriteria: [{ key: "lead", type: "performer", value: performer, modifier: "EQUALS" }],
      studioId: ref("studios:3"),
      ids: [ref("videos:70")],
      ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
    });
  });

  it("leaves out conditions it cannot make portable instead of copying their IDs", () => {
    const { objectFilter, omitted } = toPortableObjectFilter(
      {
        derivedSpanQuery: { tagIds: [5], performerIds: [12] },
        customFieldCriteria: [{ key: "cover", type: "image", value: "42", modifier: "EQUALS" }],
        extensionCriteria: [
          { extensionId: "acme", filterId: "picker", modifier: "INCLUDES", value: { value: [3] } },
          { extensionId: "acme", filterId: "text", modifier: "EQUALS", value: "kept" },
        ],
        someRecordId: 9,
        organized: true,
      },
      criteria,
      "videos",
      references,
    );

    expect(objectFilter).toEqual({
      extensionCriteria: [{ extensionId: "acme", filterId: "text", modifier: "EQUALS", value: "kept" }],
      organized: true,
    });
    expect(omitted).toEqual([
      "“derivedSpanQuery”",
      "Custom field “cover”",
      "Extension filter “picker”",
      "“someRecordId”",
    ]);
  });

  it("converts entity-picker extension filters through the extension's definition", () => {
    const key = extensionFilterKey("acme.extension", "studioPicker");
    const extensionCriteria: CriterionDefinition[] = [
      { id: "studioPicker", label: "Studio picker", type: "multiId", entityType: "studios", filterKey: key },
    ];
    const { objectFilter } = toPortableObjectFilter(
      {
        extensionCriteria: [
          { extensionId: "acme.extension", filterId: "studioPicker", modifier: "INCLUDES", value: { value: [3] } },
        ],
      },
      extensionCriteria,
      "videos",
      references,
    );

    expect(objectFilter.extensionCriteria).toEqual([
      {
        extensionId: "acme.extension",
        filterId: "studioPicker",
        modifier: "INCLUDES",
        value: { value: [ref("studios:3")] },
      },
    ]);
  });

  it("removes a condition whose every entity is gone rather than exporting it empty", () => {
    const { objectFilter } = toPortableObjectFilter(
      {
        tagsCriterion: { value: [99], modifier: "INCLUDES" },
        performersCriterion: { value: [12, 98], modifier: "INCLUDES" },
      },
      criteria,
      "videos",
      references,
    );

    expect(objectFilter).toEqual({ performersCriterion: { value: [performer], modifier: "INCLUDES" } });
  });

  it("builds an export without paging, random seeds, local display options or Cove IDs", () => {
    const { filter: exported } = buildPortableSavedFilter(
      {
        id: 41,
        mode: "videos",
        name: "Review / Outdoor",
        findFilter: JSON.stringify({ page: 3, perPage: 40, sort: "random", seed: 1234, direction: "desc" }),
        objectFilter: JSON.stringify({ tagsCriterion: { value: [5], modifier: "INCLUDES" } }),
        uiOptions: JSON.stringify({ displayMode: "grid", zoomLevel: 3, profileId: 8 }),
      },
      criteria,
      references,
    );

    expect(exported).toEqual({
      format: PORTABLE_SAVED_FILTER_FORMAT,
      version: 1,
      mode: "videos",
      name: "Review / Outdoor",
      findFilter: { perPage: 40, sort: "random", direction: "desc" },
      objectFilter: { tagsCriterion: { value: [outdoor], modifier: "INCLUDES" } },
      uiOptions: { displayMode: "grid", zoomLevel: 3 },
    });
    expect(parsePortableSavedFilter(JSON.stringify(exported))).toEqual(exported);
  });
});

describe("portable saved filters: import", () => {
  it("reports each distinct reference once and ignores references in the wrong place", () => {
    const { references: found, omitted } = inspectPortableObjectFilter(
      {
        tagsCriterion: { value: [outdoor, { ...outdoor, name: " outdoor " }, performer, 77], modifier: "INCLUDES" },
        _filterExpression: { operator: "AND", children: [{ filter: { tagsCriterion: { value: [outdoor] } } }] },
        derivedSpanQuery: { tagIds: [outdoor] },
      },
      criteria,
      "videos",
    );

    expect(found).toEqual([outdoor]);
    expect(omitted).toEqual(["“derivedSpanQuery”"]);
    expect(portableReferenceKey(outdoor)).toBe(portableReferenceKey({ ...outdoor, name: "OUTDOOR" }));
  });

  it("resolves references to local IDs and removes conditions left naming nothing", () => {
    expect(
      resolveLocally({
        tagsCriterion: { value: [outdoor, longTake], modifier: "INCLUDES_ALL" },
        studiosCriterion: { value: [ref("studios:3")], modifier: "INCLUDES" },
        groupsCriterion: { value: [], modifier: "IS_NULL" },
        customFieldCriteria: [
          { key: "lead", type: "performer", value: performer, modifier: "EQUALS" },
          { key: "venue", type: "tag", value: longTake, modifier: "EQUALS" },
        ],
        extensionCriteria: [
          { extensionId: "acme", filterId: "picker", modifier: "INCLUDES", value: { value: [longTake] } },
        ],
        ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
      }),
    ).toEqual({
      tagsCriterion: { value: [501], modifier: "INCLUDES_ALL" },
      groupsCriterion: { value: [], modifier: "IS_NULL" },
      customFieldCriteria: [
        { key: "lead", type: "performer", value: "712", displayValue: "Performer A", modifier: "EQUALS" },
      ],
      ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
    });
  });

  it("removes emptied expression branches and groups instead of leaving ones that match everything", () => {
    expect(
      resolveLocally({
        _filterExpression: {
          operator: "OR",
          children: [
            { filter: { tagsCriterion: { value: [outdoor], modifier: "INCLUDES" } } },
            { filter: { tagsCriterion: { value: [longTake], modifier: "INCLUDES" } } },
            {
              group: {
                operator: "NOT",
                children: [{ filter: { tagsCriterion: { value: [longTake], modifier: "INCLUDES" } } }],
              },
            },
          ],
        },
      }),
    ).toEqual({
      _filterExpression: {
        operator: "OR",
        children: [{ filter: { tagsCriterion: { value: [501], modifier: "INCLUDES" } } }],
      },
    });

    expect(
      resolveLocally({
        _filterExpression: { operator: "AND", children: [{ filter: { tagsCriterion: { value: [longTake] } } }] },
        ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
      }),
    ).toEqual({ ratingCriterion: { value: 80, modifier: "GREATER_THAN" } });
  });

  it("removes related and tag-duration conditions left with nothing to test", () => {
    expect(
      resolveLocally({
        performerFilterCriterion: {
          mode: "none",
          objectFilter: { tagsCriterion: { value: [longTake], modifier: "INCLUDES" } },
        },
        tagDurationCriterion: { clauses: [{ tagId: longTake, modifier: "GREATER_THAN", value: 10 }] },
        ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
      }),
    ).toEqual({ ratingCriterion: { value: 80, modifier: "GREATER_THAN" } });

    expect(
      resolveLocally({
        performerFilterCriterion: {
          objectFilter: { tagsCriterion: { value: [longTake], modifier: "INCLUDES" } },
          performerIdsCriterion: { value: [performer], modifier: "INCLUDES" },
        },
        tagDurationCriterion: {
          clauses: [
            { tagId: outdoor, modifier: "GREATER_THAN", value: 10 },
            { tagId: longTake, modifier: "LESS_THAN", value: 5 },
          ],
        },
      }),
    ).toEqual({
      performerFilterCriterion: { performerIdsCriterion: { value: [712], modifier: "INCLUDES" } },
      tagDurationCriterion: { clauses: [{ tagId: 501, modifier: "GREATER_THAN", value: 10 }] },
    });
  });

  it("does not carry bare IDs or references of the wrong type into the saved filter", () => {
    expect(
      resolveLocally({
        tagsCriterion: { value: [outdoor, 77, performer], modifier: "INCLUDES" },
        performersCriterion: { value: [123], modifier: "INCLUDES" },
      }),
    ).toEqual({ tagsCriterion: { value: [501], modifier: "INCLUDES" } });
  });

  it("rejects JSON that is not an exported saved filter", () => {
    expect(() => parsePortableSavedFilter("{")).toThrow("not valid JSON");
    expect(() => parsePortableSavedFilter(JSON.stringify({ name: "x" }))).toThrow("not an exported Cove saved filter");
    expect(() =>
      parsePortableSavedFilter(
        JSON.stringify({ format: PORTABLE_SAVED_FILTER_FORMAT, version: 2, mode: "videos", name: "x" }),
      ),
    ).toThrow("version 2 is not supported");
    expect(() =>
      parsePortableSavedFilter(
        JSON.stringify({
          format: PORTABLE_SAVED_FILTER_FORMAT,
          version: 1,
          mode: "videos",
          name: "x",
          objectFilter: [],
        }),
      ),
    ).toThrow("invalid objectFilter");
  });
});

describe("portable saved filters: conditions without a portable form", () => {
  it("leaves out entity pickers whose entity type is unknown and numeric record-ID criteria", () => {
    const unavailable = extensionFilterKey("acme", "picker");
    const definitions: CriterionDefinition[] = [
      ...criteria,
      { id: "picker", label: "Unavailable picker", type: "multiId", filterKey: unavailable },
      { id: "host", label: "Host", type: "number", filterKey: "hostIdCriterion" },
      { id: "odd", label: "Odd picker", type: "multiId", entityType: "images" as never, filterKey: "oddCriterion" },
    ];
    const { objectFilter, omitted } = toPortableObjectFilter(
      {
        extensionCriteria: [
          { extensionId: "acme", filterId: "picker", modifier: "INCLUDES", value: { value: [3, 4] } },
        ],
        hostIdCriterion: { value: 1234, modifier: "EQUALS" },
        oddCriterion: { value: [8], modifier: "INCLUDES" },
        ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
      },
      definitions,
      "videos",
      references,
    );

    expect(objectFilter).toEqual({ ratingCriterion: { value: 80, modifier: "GREATER_THAN" } });
    expect(omitted).toEqual(["Unavailable picker", "Host", "Odd picker"]);
  });

  it("leaves out unrecognized keys inside a related condition", () => {
    const { objectFilter, omitted } = toPortableObjectFilter(
      {
        performerFilterCriterion: { mode: "every", hostIds: [3], objectFilter: { favoriteCriterion: { value: true } } },
      },
      criteria,
      "videos",
      references,
    );

    expect(objectFilter).toEqual({
      performerFilterCriterion: { mode: "every", objectFilter: { favoriteCriterion: { value: true } } },
    });
    expect(omitted).toEqual(["Related Performers “hostIds”"]);
  });

  it("keeps display options such as list columns but not record IDs", () => {
    const { filter } = buildPortableSavedFilter(
      {
        id: 1,
        mode: "videos",
        name: "Columns",
        uiOptions: JSON.stringify({
          displayMode: "list",
          listColumns: ["title", "date"],
          listColumnWidths: { title: 320 },
          profileId: 4,
          profileIds: [4],
          nested: { deep: { id: 3 } },
        }),
      },
      criteria,
      references,
    );

    expect(filter.uiOptions).toEqual({
      displayMode: "list",
      listColumns: ["title", "date"],
      listColumnWidths: { title: 320 },
    });
  });

  it("removes a tag-duration condition whose clauses are all gone rather than promoting its root tag", () => {
    expect(
      resolveLocally({
        tagDurationCriterion: {
          tagId: outdoor,
          modifier: "GREATER_THAN",
          value: 1,
          clauses: [{ tagId: longTake, modifier: "GREATER_THAN", value: 10 }],
        },
        ratingCriterion: { value: 80, modifier: "GREATER_THAN" },
      }),
    ).toEqual({ ratingCriterion: { value: 80, modifier: "GREATER_THAN" } });
  });

  it("unscopes a related scope left with fewer than two conditions instead of saving one the server rejects", () => {
    const related = (tag: PortableEntityReference) => ({
      filter: { performerFilterCriterion: { objectFilter: { tagsCriterion: { value: [tag], modifier: "INCLUDES" } } } },
    });
    const resolved = resolveLocally({
      _filterExpression: {
        operator: "AND",
        children: [
          {
            group: {
              operator: "AND",
              relatedScope: { filterKey: "performerFilterCriterion", matchMode: "distinct" },
              children: [related(outdoor), related(longTake)],
            },
          },
        ],
      },
    });

    const expression = resolved._filterExpression as { children: { group?: Record<string, unknown> }[] };
    expect(JSON.stringify(resolved)).not.toContain("relatedScope");
    expect(JSON.stringify(expression)).toContain('"value":[501]');
    expect(JSON.stringify(expression)).not.toContain("$ref");
  });

  it("leaves out malformed expression groups instead of failing", () => {
    expect(() =>
      resolveLocally({
        _filterExpression: {
          operator: "AND",
          children: [
            null,
            { group: { operator: "OR" } },
            { filter: { tagsCriterion: { value: [longTake], modifier: "INCLUDES" } } },
            { filter: { ratingCriterion: { value: 80, modifier: "GREATER_THAN" } } },
          ],
        },
      }),
    ).not.toThrow();
    const { objectFilter, omitted } = toPortableObjectFilter(
      { _filterExpression: { operator: "AND", children: [null] }, tagsCriterion: 5, studiosCriterion: [3] },
      criteria,
      "videos",
      references,
    );
    expect(objectFilter).toEqual({});
    expect(omitted).toEqual(["Malformed condition group", "Tags", "Studios"]);
  });
});

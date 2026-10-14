import { afterEach, describe, expect, it, vi } from "vitest";
import { groups, performers, tagGroups, tags } from "../api/client";
import { describeEntityReference, matchEntityReference } from "../utils/savedFilterReferences";

vi.mock("../api/client", () => {
  const entityApi = () => ({ get: vi.fn(), findFiltered: vi.fn(), create: vi.fn() });
  return {
    tags: entityApi(),
    performers: entityApi(),
    studios: entityApi(),
    groups: entityApi(),
    galleries: entityApi(),
    videos: entityApi(),
    audios: entityApi(),
    tagGroups: { get: vi.fn(), list: vi.fn() },
  };
});

const page = <T>(items: T[]) => ({ items, totalCount: items.length, page: 1, perPage: 25 }) as never;
type Criteria = Record<string, { value: string; modifier: string } | undefined>;
const criteriaOf = (mock: { mock: { calls: unknown[][] } }, call: number) =>
  (mock.mock.calls[call][0] as { objectFilter: Criteria }).objectFilter;

afterEach(() => vi.clearAllMocks());

describe("matchEntityReference", () => {
  it("prefers a remote ID on the same endpoint", async () => {
    vi.mocked(tags.findFiltered).mockResolvedValueOnce(page([{ id: 4, name: "Outdoor" }]));

    await expect(
      matchEntityReference({
        $ref: "tags",
        name: "Outdoor",
        remoteIds: [{ endpoint: "https://e/graphql", remoteId: "r-1" }],
      }),
    ).resolves.toEqual({ id: 4, name: "Outdoor", matchedBy: "remoteId" });
    expect(criteriaOf(vi.mocked(tags.findFiltered), 0)).toEqual({
      remoteIdCriterion: { value: "https://e/graphql", modifier: "EQUALS" },
      remoteIdValueCriterion: { value: "r-1", modifier: "EQUALS" },
    });
  });

  it("matches a name case-insensitively with an anchored, escaped expression", async () => {
    vi.mocked(tags.findFiltered).mockResolvedValueOnce(page([{ id: 9, name: "c++ (beta)" }]));

    await expect(matchEntityReference({ $ref: "tags", name: "C++ (Beta)" })).resolves.toEqual({
      id: 9,
      name: "c++ (beta)",
      matchedBy: "name",
    });
    expect(criteriaOf(vi.mocked(tags.findFiltered), 0).nameCriterion).toEqual({
      value: "^C\\+\\+ \\(Beta\\)$",
      modifier: "MATCHES_REGEX",
    });
  });

  it("falls back to an exact alias, and resolves an ambiguous name to nothing", async () => {
    vi.mocked(tags.findFiltered)
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page([{ id: 12, name: "Open Air", aliases: ["outdoors", "Outdoor"] }]));
    await expect(matchEntityReference({ $ref: "tags", name: "outdoor" })).resolves.toEqual({
      id: 12,
      name: "Open Air",
      matchedBy: "name",
    });
    expect(criteriaOf(vi.mocked(tags.findFiltered), 1).aliasesCriterion).toEqual({
      value: "^outdoor$",
      modifier: "MATCHES_REGEX",
    });

    vi.mocked(tags.findFiltered).mockResolvedValueOnce(
      page([
        { id: 1, name: "Twin" },
        { id: 2, name: "twin" },
      ]),
    );
    await expect(matchEntityReference({ $ref: "tags", name: "Twin" })).resolves.toBeNull();
  });

  it("requires a performer's disambiguation to match", async () => {
    vi.mocked(performers.findFiltered).mockResolvedValue(
      page([
        { id: 1, name: "Performer A", disambiguation: "I" },
        { id: 2, name: "Performer A", disambiguation: "II" },
      ]),
    );

    await expect(
      matchEntityReference({ $ref: "performers", name: "Performer A", disambiguation: "ii" }),
    ).resolves.toEqual({ id: 2, name: "Performer A", matchedBy: "name" });
  });

  it("matches a group by one alias in its comma-separated alias list", async () => {
    vi.mocked(groups.findFiltered)
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page([{ id: 5, name: "Series Five", aliases: "S5, The Fifth" }]));

    await expect(matchEntityReference({ $ref: "groups", name: "the fifth" })).resolves.toEqual({
      id: 5,
      name: "Series Five",
      matchedBy: "name",
    });
    expect(criteriaOf(vi.mocked(groups.findFiltered), 1).aliasesCriterion).toEqual({
      value: "(^|,)\\s*the fifth\\s*(,|$)",
      modifier: "MATCHES_REGEX",
    });
  });

  it("matches tag groups by name from the full list", async () => {
    vi.mocked(tagGroups.list).mockResolvedValue([
      { id: 3, name: "Themes" },
      { id: 4, name: "Places" },
    ] as never);

    await expect(matchEntityReference({ $ref: "tagGroups", name: "places" })).resolves.toEqual({
      id: 4,
      name: "Places",
      matchedBy: "name",
    });
  });
});

describe("describeEntityReference", () => {
  it("treats a missing entity as gone but surfaces any other failure", async () => {
    vi.mocked(tags.get).mockRejectedValueOnce(new Error("API Error 404: not found"));
    await expect(describeEntityReference("tags", 1)).resolves.toBeNull();

    vi.mocked(tags.get).mockRejectedValueOnce(new Error("API Error 503: unavailable"));
    await expect(describeEntityReference("tags", 1)).rejects.toThrow("503");
  });
});

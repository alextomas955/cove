import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { faces, galleries, videos } from "../api/client";
import { ActiveObjectFilterChips } from "../components/ActiveObjectFilterChips";
import { GALLERY_CRITERIA, VIDEO_CRITERIA } from "../components/filterCriteriaCatalogs";
import type { CriterionDefinition } from "../components/filterCriteriaTypes";
import { RAW_SEGMENT_CRITERIA } from "../pages/segments/segmentCriteriaDefinitions";

vi.mock("../state/AppConfigContext", () => ({
  useOptionalAppConfig: () => ({ config: { interface: { language: "en-US" }, ui: {} } }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

function renderChips(criteriaDefinitions: CriterionDefinition[], objectFilter: Record<string, unknown>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ActiveObjectFilterChips
        criteriaDefinitions={criteriaDefinitions}
        objectFilter={objectFilter}
        onRemove={vi.fn()}
        onEdit={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return queryClient;
}

// Galleries, videos and faces are too many to list up front, and imported saved filters carry no
// stored names, so their chips look each unnamed ID up.
it.each([
  {
    entities: "galleries on a video list",
    criteria: VIDEO_CRITERIA,
    filterKey: "galleriesCriterion",
    chipName: "Edit filter: Galleries",
    mockGet: () =>
      vi.spyOn(galleries, "get").mockImplementation(async (id) => ({ id, title: `Example ${id}` }) as never),
  },
  {
    entities: "videos on a gallery list",
    criteria: GALLERY_CRITERIA,
    filterKey: "videosCriterion",
    chipName: "Edit filter: Videos",
    mockGet: () => vi.spyOn(videos, "get").mockImplementation(async (id) => ({ id, title: `Example ${id}` }) as never),
  },
  {
    entities: "faces on the segment list",
    criteria: RAW_SEGMENT_CRITERIA,
    filterKey: "rawFacesCriterion",
    chipName: "Edit filter: Faces",
    mockGet: () => vi.spyOn(faces, "get").mockImplementation(async (id) => ({ id, label: `Example ${id}` }) as never),
  },
])("names $entities by looking up each unnamed ID", async ({ criteria, filterKey, chipName, mockGet }) => {
  const get = mockGet();

  renderChips(criteria, {
    [filterKey]: {
      value: [5, { id: 9, label: "Labelled Item" }],
      excludes: [5, 6, 8],
      modifier: "INCLUDES",
      _names: { "8": "Stored Name" },
    },
  });

  const chip = screen.getByRole("button", { name: chipName });
  await waitFor(() => {
    expect(chip).toHaveTextContent("Example 5");
    expect(chip).toHaveTextContent("Example 6");
  });
  expect(chip).toHaveTextContent("Labelled Item");
  expect(chip).toHaveTextContent("Stored Name");
  expect(screen.queryByText(/Unavailable item/)).not.toBeInTheDocument();
  expect(get.mock.calls.map(([id]) => id).sort()).toEqual([5, 6]);
});

it("keeps an ID that no longer exists unavailable", async () => {
  const get = vi.spyOn(galleries, "get").mockRejectedValue(new Error("API Error 404: Not Found"));

  const queryClient = renderChips(VIDEO_CRITERIA, { galleriesCriterion: { value: [404], modifier: "INCLUDES" } });

  await waitFor(() =>
    expect(queryClient.getQueryState(["multi-id-selector", "galleries", "selected", 404])?.status).toBe("error"),
  );
  expect(get).toHaveBeenCalledWith(404);
  expect(screen.getByRole("button", { name: "Edit filter: Galleries" })).toHaveTextContent("Unavailable item");
});

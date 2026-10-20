import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { performers, tags } from "../api/client";
import { ActiveObjectFilterChips } from "../components/ActiveObjectFilterChips";
import { VIDEO_CRITERIA } from "../components/filterCriteriaCatalogs";

vi.mock("../state/AppConfigContext", () => ({
  useOptionalAppConfig: () => ({ config: { interface: { language: "en-US" }, ui: {} } }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const relatedPerformers = {
  objectFilter: { genderCriterion: { value: "^(?:Female)$", modifier: "MATCHES_REGEX" } },
  performerIdsCriterion: { value: [7], modifier: "INCLUDES" },
  performerOccurrenceTagsCriterion: { value: [], excludes: [41, 42], modifier: "INCLUDES_ALL", depth: -1 },
};

// An imported saved filter carries no local `_names`, so criteria beside a related filter's
// `objectFilter` must still bring their entity names into the chips.
it.each([
  ["at the top level", { performerFilterCriterion: relatedPerformers }],
  [
    "inside a filter expression",
    {
      _filterExpression: {
        operator: "OR",
        children: [
          { filter: { performerFilterCriterion: relatedPerformers } },
          { filter: { performerCountCriterion: { modifier: "EQUALS", value: 2 } } },
        ],
      },
    },
  ],
])("names entities in related-filter context criteria %s without stored name hints", async (_, objectFilter) => {
  vi.spyOn(tags, "find").mockResolvedValue({
    items: [
      { id: 41, name: "Example Tag One" },
      { id: 42, name: "Example Tag Two" },
    ],
    count: 2,
  } as never);
  vi.spyOn(performers, "find").mockResolvedValue({ items: [{ id: 7, name: "Example Performer" }], count: 1 } as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <ActiveObjectFilterChips
        criteriaDefinitions={VIDEO_CRITERIA}
        objectFilter={objectFilter}
        onRemove={vi.fn()}
        onEdit={vi.fn()}
      />
    </QueryClientProvider>,
  );

  await waitFor(() => {
    for (const name of ["Example Tag One", "Example Tag Two", "Example Performer"])
      expect(screen.getAllByText(new RegExp(name)).length).toBeGreaterThan(0);
  });
  expect(screen.queryByText(/Unavailable item/)).not.toBeInTheDocument();
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  registrySearch: vi.fn(),
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    extensions: {
      ...actual.extensions,
      list: vi.fn().mockResolvedValue([]),
      registrySearch: mocks.registrySearch,
      registryGetCategories: vi.fn().mockResolvedValue([]),
      registryCheckUpdates: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock("../extensions/ExtensionLoader", () => ({
  useExtensions: () => ({
    manifest: { tutorialTopics: [] },
    refreshManifest: vi.fn().mockResolvedValue({ tutorialTopics: [] }),
  }),
}));

import { FindAndInstallExtensions } from "../pages/SettingsPage";

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FindAndInstallExtensions />
    </QueryClientProvider>,
  );
}

const lastSearch = () => mocks.registrySearch.mock.calls.at(-1)?.[0];

describe("Discover extensions sort", () => {
  beforeEach(() => {
    // Enough results for a second page so the pager is shown.
    mocks.registrySearch.mockReset().mockResolvedValue({
      items: [{ id: "com.example.one", name: "Example One", version: "1.0.0", categories: ["metadata"] }],
      totalCount: 45,
      page: 1,
      pageSize: 20,
    });
  });

  it("defaults to the registry's own order and does not send a sort parameter", async () => {
    renderPanel();

    const sort = screen.getByRole("combobox", { name: "Sort extensions" });
    expect(sort).toHaveValue("");
    expect(sort).toHaveDisplayValue("Default order");
    await waitFor(() => expect(mocks.registrySearch).toHaveBeenCalled());
    expect(lastSearch()).toMatchObject({ page: 1 });
    expect(lastSearch().sort).toBeUndefined();
  });

  it.each([
    ["Recently updated", "updated"],
    ["Name (A–Z)", "name"],
  ])("sends sort=%s as %s", async (label, sortValue) => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => expect(mocks.registrySearch).toHaveBeenCalled());

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort extensions" }), label);

    await waitFor(() => expect(lastSearch()).toMatchObject({ sort: sortValue, page: 1 }));
  });

  it("combines the sort with search and type filters and resets to the first page", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => expect(mocks.registrySearch).toHaveBeenCalled());

    await user.selectOptions(screen.getByTitle("Filter by extension type"), "scraper");
    await user.type(screen.getByPlaceholderText("Search the extension registry..."), "tag");
    await user.click(await screen.findByRole("button", { name: "Next page" }));
    await waitFor(() => expect(lastSearch()).toMatchObject({ page: 2 }));

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort extensions" }), "Recently updated");

    await waitFor(() =>
      expect(lastSearch()).toEqual(expect.objectContaining({ q: "tag", type: "scraper", sort: "updated", page: 1 })),
    );
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { performers, savedFilters, studios, tags } from "../api/client";
import { SavedFilterMenu } from "../components/SavedFilterMenu";
import { VIDEO_CRITERIA } from "../components/filterCriteriaCatalogs";
import type { CriterionDefinition } from "../components/filterCriteriaTypes";
import { PORTABLE_SAVED_FILTER_FORMAT } from "../utils/portableSavedFilter";

vi.mock("../api/client", () => {
  const entityApi = () => ({ get: vi.fn(), findFiltered: vi.fn(), create: vi.fn() });
  return {
    savedFilters: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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

const stashBox = "https://stash-box.example/graphql";
const page = <T,>(items: T[]) => ({ items, totalCount: items.length, page: 1, perPage: 25 });

function renderMenu() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SavedFilterMenu
        mode="videos"
        currentFilter={{ page: 1 }}
        onApplyFilter={vi.fn()}
        criteria={VIDEO_CRITERIA as CriterionDefinition[]}
      />
    </QueryClientProvider>,
  );
}

async function openTransferDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTitle("Saved filters"));
  await user.click(screen.getByRole("button", { name: "Import / Export" }));
  return screen.getByRole("dialog", { name: "Import / Export saved filter" });
}

/** The JSON preview is folded by default; expanding it once the export is ready returns the preview. */
async function showExportedJson(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await within(dialog).findByText(/by name and remote ID|No linked items/);
  await user.click(within(dialog).getByRole("button", { name: "JSON" }));
  return within(dialog).getByRole("textbox", { name: "Exported saved filter JSON" });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("SavedFilterTransferDialog", () => {
  it("exports a saved filter with names and remote IDs instead of Cove IDs and copies it", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([
      {
        id: 7,
        mode: "videos",
        name: "Outdoor favourites",
        findFilter: JSON.stringify({ page: 2, sort: "date", direction: "desc" }),
        objectFilter: JSON.stringify({
          tagsCriterion: { value: [5], modifier: "INCLUDES", _names: { "5": "Outdoor" } },
          favoriteCriterion: { value: true },
        }),
      },
    ]);
    vi.mocked(tags.get).mockResolvedValue({
      id: 5,
      name: "Outdoor",
      remoteIds: [{ endpoint: stashBox, remoteId: "tag-outdoor" }],
    } as never);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderMenu();

    const dialog = await openTransferDialog(user);
    await within(dialog).findByText("1 tag, by name and remote ID");
    expect(within(dialog).getByRole("button", { name: "JSON" })).toHaveAttribute("aria-expanded", "false");
    expect(within(dialog).queryByRole("textbox", { name: "Exported saved filter JSON" })).not.toBeInTheDocument();

    // Copying does not need the JSON shown.
    await user.click(within(dialog).getByRole("button", { name: "Copy to clipboard" }));
    expect(within(dialog).getByText("Copied to clipboard.")).toBeInTheDocument();

    const preview = await showExportedJson(user, dialog);
    expect(writeText).toHaveBeenCalledWith((preview as HTMLTextAreaElement).value);
    const exported = JSON.parse((preview as HTMLTextAreaElement).value);

    expect(exported).toEqual({
      format: PORTABLE_SAVED_FILTER_FORMAT,
      version: 1,
      mode: "videos",
      name: "Outdoor favourites",
      objectFilter: {
        tagsCriterion: {
          value: [{ $ref: "tags", name: "Outdoor", remoteIds: [{ endpoint: stashBox, remoteId: "tag-outdoor" }] }],
          modifier: "INCLUDES",
        },
        favoriteCriterion: { value: true },
      },
    });
  });

  it("shows which linked items were found and creates the missing ones it was allowed to", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    vi.mocked(savedFilters.create).mockResolvedValue({ id: 90, mode: "videos", name: "Imported" });
    vi.mocked(tags.findFiltered).mockImplementation(async ({ objectFilter }) => {
      const criteria = objectFilter as Record<string, { value: string }>;
      if (criteria.remoteIdValueCriterion?.value === "tag-outdoor")
        return page([{ id: 501, name: "Outdoor" }]) as never;
      return page([]) as never;
    });
    vi.mocked(studios.findFiltered).mockImplementation(async ({ objectFilter }) => {
      const criteria = objectFilter as Record<string, { value: string }>;
      // The server matches regular expressions case-insensitively, so a differently cased name is still found.
      if (criteria.nameCriterion?.value === "^Studio North$") return page([{ id: 33, name: "studio north" }]) as never;
      return page([]) as never;
    });
    vi.mocked(performers.findFiltered).mockResolvedValue(page([]) as never);
    vi.mocked(tags.create).mockResolvedValue({ id: 602, name: "Long take" } as never);
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);
    await user.click(within(dialog).getByRole("tab", { name: "Import" }));
    fireEvent.change(within(dialog).getByLabelText("Paste exported JSON"), {
      target: {
        value: JSON.stringify({
          format: PORTABLE_SAVED_FILTER_FORMAT,
          version: 1,
          mode: "videos",
          name: "Outdoor favourites",
          findFilter: { sort: "date" },
          objectFilter: {
            tagsCriterion: {
              value: [
                { $ref: "tags", name: "Outdoor", remoteIds: [{ endpoint: stashBox, remoteId: "tag-outdoor" }] },
                { $ref: "tags", name: "Long take" },
              ],
              modifier: "INCLUDES_ALL",
            },
            studiosCriterion: { value: [{ $ref: "studios", name: "Studio North" }], modifier: "INCLUDES" },
            performersCriterion: { value: [{ $ref: "performers", name: "Performer A" }], modifier: "INCLUDES" },
          },
        }),
      },
    });

    const table = await within(dialog).findByRole("table");
    const row = (name: string) => within(table).getByText(name).closest("tr")!;
    expect(within(row("Outdoor")).getByText("Found by remote ID")).toBeInTheDocument();
    expect(within(row("Studio North")).getByText("Found by name")).toBeInTheDocument();
    expect(within(row("Long take")).getByRole("checkbox", { name: "Create tag “Long take”" })).toBeChecked();
    await user.click(within(row("Performer A")).getByRole("checkbox", { name: "Create performer “Performer A”" }));
    expect(within(dialog).getByText("Creates 1 tag")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Save as")).toHaveValue("Outdoor favourites");

    await user.click(within(dialog).getByRole("button", { name: "Import filter" }));

    await waitFor(() => expect(savedFilters.create).toHaveBeenCalledTimes(1));
    expect(tags.create).toHaveBeenCalledWith({ name: "Long take" });
    expect(performers.create).not.toHaveBeenCalled();
    const created = vi.mocked(savedFilters.create).mock.calls[0][0];
    expect(created).toMatchObject({
      mode: "videos",
      name: "Outdoor favourites",
      findFilter: JSON.stringify({ sort: "date" }),
    });
    expect(JSON.parse(created.objectFilter!)).toEqual({
      tagsCriterion: { value: [501, 602], modifier: "INCLUDES_ALL" },
      studiosCriterion: { value: [33], modifier: "INCLUDES" },
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Import / Export saved filter" })).not.toBeInTheDocument(),
    );
  });

  it("refuses a filter exported from a different list", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);
    await user.click(within(dialog).getByRole("tab", { name: "Import" }));
    fireEvent.change(within(dialog).getByLabelText("Paste exported JSON"), {
      target: {
        value: JSON.stringify({ format: PORTABLE_SAVED_FILTER_FORMAT, version: 1, mode: "performers", name: "x" }),
      },
    });

    expect(within(dialog).getByRole("alert")).toHaveTextContent("belongs to the “performers” list");
    expect(within(dialog).getByRole("button", { name: "Import filter" })).toBeDisabled();
  });

  it("reuses entities an earlier attempt created when retrying a failed import", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    vi.mocked(savedFilters.create).mockResolvedValue({ id: 91, mode: "videos", name: "Imported" });
    vi.mocked(tags.findFiltered).mockResolvedValue(page([]) as never);
    vi.mocked(studios.findFiltered).mockResolvedValue(page([]) as never);
    vi.mocked(tags.create).mockResolvedValue({ id: 602, name: "Long take" } as never);
    vi.mocked(studios.create)
      .mockRejectedValueOnce(new Error("API Error 500: unavailable"))
      .mockResolvedValueOnce({ id: 34, name: "Studio South" } as never);
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);
    await user.click(within(dialog).getByRole("tab", { name: "Import" }));
    fireEvent.change(within(dialog).getByLabelText("Paste exported JSON"), {
      target: {
        value: JSON.stringify({
          format: PORTABLE_SAVED_FILTER_FORMAT,
          version: 1,
          mode: "videos",
          name: "Retry",
          objectFilter: {
            tagsCriterion: { value: [{ $ref: "tags", name: "Long take" }], modifier: "INCLUDES" },
            studiosCriterion: { value: [{ $ref: "studios", name: "Studio South" }], modifier: "INCLUDES" },
          },
        }),
      },
    });
    await within(dialog).findByRole("table");

    await user.click(within(dialog).getByRole("button", { name: "Import filter" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("API Error 500");
    await user.click(within(dialog).getByRole("button", { name: "Import filter" }));

    await waitFor(() => expect(savedFilters.create).toHaveBeenCalledTimes(1));
    expect(tags.create).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(savedFilters.create).mock.calls[0][0].objectFilter!)).toEqual({
      tagsCriterion: { value: [602], modifier: "INCLUDES" },
      studiosCriterion: { value: [34], modifier: "INCLUDES" },
    });
  });

  it("refuses to export when a linked item cannot be read, instead of silently dropping it", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([
      {
        id: 8,
        mode: "videos",
        name: "Restricted",
        objectFilter: JSON.stringify({ tagsCriterion: { value: [5], modifier: "INCLUDES" } }),
      },
    ]);
    vi.mocked(tags.get).mockRejectedValue(new Error("API Error 403: forbidden"));
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Could not prepare this saved filter");
    expect(within(dialog).queryByRole("textbox", { name: "Exported saved filter JSON" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy to clipboard" })).toBeDisabled();
  });

  it("starts on the Export tab with a clean import form each time it opens", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderMenu();

    let dialog = await openTransferDialog(user);
    await user.click(within(dialog).getByRole("tab", { name: "Import" }));
    fireEvent.change(within(dialog).getByLabelText("Paste exported JSON"), { target: { value: "{" } });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getByTitle("Saved filters")).toHaveFocus();

    dialog = await openTransferDialog(user);
    expect(within(dialog).getByRole("tab", { name: "Export" })).toHaveAttribute("aria-selected", "true");
    await user.click(within(dialog).getByRole("tab", { name: "Import" }));
    expect(within(dialog).getByLabelText("Paste exported JSON")).toHaveValue("");
  });

  it("keeps Tab and Shift+Tab inside the dialog and off the inactive tab", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);
    const importTab = within(dialog).getByRole("tab", { name: "Import" });
    await user.click(importTab);
    expect(importTab).toHaveFocus();

    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(within(dialog).getByRole("tab", { name: "Export" })).not.toHaveFocus();
  });

  it("picks the filter to export from the menu's grouped list, filtered by name", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([
      { id: 1, mode: "videos", name: "Review / Untagged" },
      { id: 2, mode: "videos", name: "Review / Low resolution", findFilter: JSON.stringify({ sort: "title" }) },
      { id: 3, mode: "videos", name: "Favourites" },
    ]);
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);
    const list = within(dialog).getByRole("listbox", { name: "Saved filter to export" });
    expect(within(list).getByRole("button", { name: "Review, 2 filters" })).toHaveAttribute("aria-expanded", "true");
    expect(within(list).getByRole("option", { name: "Untagged" })).toHaveAttribute("aria-selected", "true");

    await user.type(within(dialog).getByRole("textbox", { name: "Search saved filter to export" }), "low");
    expect(
      within(list)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Low resolution"]);

    await user.click(within(list).getByRole("option", { name: "Low resolution" }));
    const preview = await showExportedJson(user, dialog);
    await waitFor(() =>
      expect(JSON.parse((preview as HTMLTextAreaElement).value).name).toBe("Review / Low resolution"),
    );
  });

  it("leaves out display options and sorting unless the exporter opts in, always keeping the search term", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([
      {
        id: 4,
        mode: "videos",
        name: "Searched",
        findFilter: JSON.stringify({ q: "beach", sort: "title", direction: "asc", perPage: 60 }),
        uiOptions: JSON.stringify({ displayMode: "list", zoomLevel: 2 }),
      },
    ]);
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);
    const preview = await showExportedJson(user, dialog);
    const exported = () => JSON.parse((preview as HTMLTextAreaElement).value);
    expect(within(dialog).getByRole("checkbox", { name: "Display options (layout, zoom, columns)" })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Sorting and page size" })).not.toBeChecked();
    expect(exported()).toEqual({
      format: PORTABLE_SAVED_FILTER_FORMAT,
      version: 1,
      mode: "videos",
      name: "Searched",
      findFilter: { q: "beach" },
    });

    await user.click(within(dialog).getByRole("checkbox", { name: "Display options (layout, zoom, columns)" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Sorting and page size" }));

    expect(exported()).toMatchObject({
      findFilter: { q: "beach", sort: "title", direction: "asc", perPage: 60 },
      uiOptions: { displayMode: "list", zoomLevel: 2 },
    });
  });

  it("exports an older filter's legacy favorite-performer condition in its current form", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([
      {
        id: 5,
        mode: "videos",
        name: "Legacy",
        objectFilter: JSON.stringify({ performerFavoriteCriterion: { value: true } }),
      },
    ]);
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);
    const preview = await showExportedJson(user, dialog);

    expect(JSON.parse((preview as HTMLTextAreaElement).value).objectFilter).toEqual({
      performerFilterCriterion: { objectFilter: { favoriteCriterion: { value: true } } },
    });
    expect(preview).toHaveClass("overscroll-contain");
    expect(within(dialog).queryByText(/conditions? can’t be exported/)).not.toBeInTheDocument();
  });

  it("keeps pasted JSON when switching between the tabs", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderMenu();

    const dialog = await openTransferDialog(user);
    await user.click(within(dialog).getByRole("tab", { name: "Import" }));
    fireEvent.change(within(dialog).getByLabelText("Paste exported JSON"), { target: { value: "{ draft" } });
    await user.click(within(dialog).getByRole("tab", { name: "Export" }));
    await user.click(within(dialog).getByRole("tab", { name: "Import" }));

    expect(within(dialog).getByLabelText("Paste exported JSON")).toHaveValue("{ draft");
  });
});

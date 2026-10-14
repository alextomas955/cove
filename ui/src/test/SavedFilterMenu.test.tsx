import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { savedFilters } from "../api/client";
import { SavedFilterMenu } from "../components/SavedFilterMenu";

vi.mock("../api/client", () => ({
  savedFilters: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderMenu() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SavedFilterMenu
        mode="videos"
        currentFilter={{ page: 2, sort: "title", direction: "asc" }}
        currentObjectFilter={{ favoriteCriterion: { value: true } }}
        currentUIOptions={{ displayMode: "list", zoomLevel: 5.25 }}
        onApplyFilter={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("SavedFilterMenu", () => {
  it("closes when clicking outside the menu", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <div>
          <button type="button">Outside</button>
          <SavedFilterMenu mode="videos" currentFilter={{ page: 1, perPage: 40 }} onApplyFilter={vi.fn()} />
        </div>
      </QueryClientProvider>,
    );

    await user.click(screen.getByTitle("Saved filters"));
    expect(screen.getByRole("dialog", { name: "Saved filters" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save current filter" }));
    expect(screen.getByPlaceholderText("Filter name...")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByRole("dialog", { name: "Saved filters" })).not.toBeInTheDocument();
  });

  it("exposes its open state and closes on Escape", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByTitle("Saved filters");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Saved filters" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog", { name: "Saved filters" })).not.toBeInTheDocument();
  });

  it("reveals a truncated saved-filter name on hover and keyboard focus", async () => {
    const longName = "A saved filter name that cannot fit in the available width";
    vi.mocked(savedFilters.list).mockResolvedValue([{ id: 1, mode: "videos", name: longName, findFilter: "{}" }]);
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTitle("Saved filters"));
    const filterButton = await screen.findByRole("button", { name: longName });
    Object.defineProperties(filterButton, {
      clientWidth: { configurable: true, value: 120 },
      scrollWidth: { configurable: true, value: 320 },
    });

    await user.hover(filterButton);
    const hoverTooltip = screen.getByRole("tooltip", { name: longName });
    expect(filterButton).toHaveAttribute("aria-describedby", hoverTooltip.id);

    await user.unhover(filterButton);
    await user.hover(hoverTooltip);
    expect(screen.getByRole("tooltip", { name: longName })).toBeInTheDocument();
    await user.unhover(hoverTooltip);
    await waitFor(() => expect(screen.queryByRole("tooltip", { name: longName })).not.toBeInTheDocument());

    await user.tab();
    expect(filterButton).toHaveFocus();
    expect(screen.getByRole("tooltip", { name: longName })).toBeInTheDocument();
  });

  it("does not add a tooltip when the saved-filter name fits", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([{ id: 1, mode: "videos", name: "Short name", findFilter: "{}" }]);
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTitle("Saved filters"));
    const filterButton = await screen.findByRole("button", { name: "Short name" });
    Object.defineProperties(filterButton, {
      clientWidth: { configurable: true, value: 120 },
      scrollWidth: { configurable: true, value: 80 },
    });

    await user.hover(filterButton);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(filterButton).not.toHaveAttribute("aria-describedby");
  });

  it("stays open when a mobile viewport shift moves the trigger offscreen while naming a filter", async () => {
    const visualViewport = Object.assign(new EventTarget(), {
      offsetTop: 0,
      offsetLeft: 0,
      width: 390,
      height: 400,
    });
    vi.stubGlobal("visualViewport", visualViewport);
    vi.mocked(savedFilters.list).mockResolvedValue([]);
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByTitle("Saved filters");
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Save current filter" }));
    const input = screen.getByPlaceholderText("Filter name...");
    expect(input).toHaveFocus();

    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: -100,
      top: -100,
      bottom: -76,
      left: 0,
      right: 48,
      width: 48,
      height: 24,
      toJSON: () => ({}),
    });
    fireEvent(visualViewport as unknown as Window, new Event("resize"));

    const dialog = await screen.findByRole("dialog", { name: "Saved filters" });
    await waitFor(() => expect(dialog).toHaveStyle({ top: "8px" }));
    expect(dialog).toHaveStyle({ maxHeight: "384px", maxWidth: "374px", minWidth: "224px" });
    expect(input).toHaveFocus();
  });

  it("updates a saved filter from the current state", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([
      { id: 2, mode: "videos", name: "alpha", findFilter: "{}" },
      { id: 1, mode: "videos", name: "Zulu", findFilter: "{}" },
    ]);
    vi.mocked(savedFilters.update).mockResolvedValue({
      id: 2,
      mode: "videos",
      name: "alpha",
      findFilter: "{}",
    });
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTitle("Saved filters"));
    await screen.findByRole("button", { name: "alpha" });
    await user.click(screen.getByRole("button", { name: 'Update saved filter "alpha"' }));

    await waitFor(() =>
      expect(savedFilters.update).toHaveBeenCalledWith(2, {
        findFilter: JSON.stringify({ page: 2, sort: "title", direction: "asc" }),
        objectFilter: JSON.stringify({ favoriteCriterion: { value: true } }),
        uiOptions: JSON.stringify({ displayMode: "list", zoomLevel: 5.25 }),
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Saved filters" })).not.toBeInTheDocument());
  });

  it("applies saved display and zoom options", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([
      {
        id: 1,
        mode: "videos",
        name: "Large wall",
        findFilter: "{}",
        uiOptions: JSON.stringify({ displayMode: "wall", zoomLevel: 5.25 }),
      },
    ]);
    const onApplyUIOptions = vi.fn();
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <SavedFilterMenu
          mode="videos"
          currentFilter={{ page: 1 }}
          onApplyFilter={vi.fn()}
          onApplyUIOptions={onApplyUIOptions}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTitle("Saved filters"));
    await user.click(await screen.findByRole("button", { name: "Large wall" }));

    expect(onApplyUIOptions).toHaveBeenCalledWith({ displayMode: "wall", zoomLevel: 5.25 });
  });

  it("applies empty ui options for filters saved without them", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([{ id: 3, mode: "videos", name: "Plain", findFilter: "{}" }]);
    const onApplyUIOptions = vi.fn();
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <SavedFilterMenu
          mode="videos"
          currentFilter={{ page: 1 }}
          onApplyFilter={vi.fn()}
          onApplyUIOptions={onApplyUIOptions}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTitle("Saved filters"));
    await user.click(await screen.findByRole("button", { name: "Plain" }));

    expect(onApplyUIOptions).toHaveBeenCalledWith({});
  });

  it("applies filters saved without find options using the mode's default sort", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([
      { id: 4, mode: "videos", name: "Worklist", findFilter: null, objectFilter: JSON.stringify({ ids: [7, 3] }) },
    ] as unknown as Awaited<ReturnType<typeof savedFilters.list>>);
    const onApplyFilter = vi.fn();
    const onApplyObjectFilter = vi.fn();
    const onApplyUIOptions = vi.fn();
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <SavedFilterMenu
          mode="videos"
          currentFilter={{ page: 3, sort: "title", direction: "asc" }}
          onApplyFilter={onApplyFilter}
          onApplyObjectFilter={onApplyObjectFilter}
          onApplyUIOptions={onApplyUIOptions}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByTitle("Saved filters"));
    await user.click(await screen.findByRole("button", { name: "Worklist" }));

    expect(onApplyFilter).toHaveBeenCalledWith({ sort: "date", direction: "desc" });
    expect(onApplyObjectFilter).toHaveBeenCalledWith({ ids: [7, 3] });
    expect(onApplyUIOptions).toHaveBeenCalledWith({});
    expect(screen.queryByRole("dialog", { name: "Saved filters" })).not.toBeInTheDocument();
  });

  it("keeps the menu open and reports an update failure", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([{ id: 2, mode: "videos", name: "Favorites", findFilter: "{}" }]);
    vi.mocked(savedFilters.update).mockRejectedValue(new Error("Conflict"));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTitle("Saved filters"));
    await user.click(await screen.findByRole("button", { name: 'Update saved filter "Favorites"' }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not update this saved filter.");
    expect(screen.getByRole("dialog", { name: "Saved filters" })).toBeInTheDocument();
  });

  it("does not create a duplicate name ignoring case and whitespace", async () => {
    vi.mocked(savedFilters.list).mockResolvedValue([{ id: 1, mode: "videos", name: "Favorites", findFilter: "{}" }]);
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByTitle("Saved filters"));
    await user.click(await screen.findByRole("button", { name: "Save current filter" }));
    await user.type(screen.getByPlaceholderText("Filter name..."), " favorites ");

    expect(screen.getByText("A saved filter with this name already exists.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create saved filter" })).toBeDisabled();
    expect(savedFilters.create).not.toHaveBeenCalled();
  });

  describe("search and groups", () => {
    const grouped = [
      { id: 1, mode: "videos", name: "1080p/4K", findFilter: "{}" },
      { id: 2, mode: "videos", name: "Length / Over 1 hour", findFilter: "{}" },
      { id: 3, mode: "videos", name: "Length / Under 5 min", findFilter: '{"sort":"duration"}' },
      { id: 4, mode: "videos", name: "Needs work / No tags", findFilter: "{}" },
      { id: 5, mode: "videos", name: "Recently added", findFilter: "{}" },
    ];

    function renderGroupedMenu(onApplyFilter = vi.fn()) {
      vi.mocked(savedFilters.list).mockResolvedValue(grouped);
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <SavedFilterMenu mode="videos" currentFilter={{ page: 1 }} onApplyFilter={onApplyFilter} />
        </QueryClientProvider>,
      );
      return onApplyFilter;
    }

    it("focuses the header search and narrows the list as you type", async () => {
      const user = userEvent.setup();
      renderGroupedMenu();

      await user.click(screen.getByTitle("Saved filters"));
      const search = screen.getByRole("textbox", { name: "Search saved filters" });
      expect(search).toHaveAttribute("placeholder", "Saved filters");
      await waitFor(() => expect(search).toHaveFocus());
      await screen.findByRole("button", { name: "Recently added" });

      await user.keyboard("min");

      expect(screen.getByText("1/5")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Under 5 min" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Recently added" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Needs work/ })).not.toBeInTheDocument();

      await user.clear(search);
      await user.type(search, "zzz");
      expect(screen.getByText("No saved filters match")).toBeInTheDocument();
    });

    it("applies the highlighted match with Enter and moves the highlight with the arrow keys", async () => {
      const user = userEvent.setup();
      const onApplyFilter = renderGroupedMenu();

      await user.click(screen.getByTitle("Saved filters"));
      await screen.findByRole("button", { name: "Recently added" });
      await user.type(screen.getByRole("textbox", { name: "Search saved filters" }), "length");
      await user.keyboard("{ArrowDown}{Enter}");

      expect(onApplyFilter).toHaveBeenCalledWith(expect.objectContaining({ sort: "duration" }));
      expect(screen.queryByRole("dialog", { name: "Saved filters" })).not.toBeInTheDocument();
    });

    it("clears the search on the first Escape and closes on the second", async () => {
      const user = userEvent.setup();
      renderGroupedMenu();

      await user.click(screen.getByTitle("Saved filters"));
      const search = screen.getByRole("textbox", { name: "Search saved filters" });
      await user.type(search, "tags");
      await user.keyboard("{Escape}");

      expect(search).toHaveValue("");
      expect(screen.getByRole("dialog", { name: "Saved filters" })).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog", { name: "Saved filters" })).not.toBeInTheDocument();
    });

    it("groups names on a spaced slash and remembers collapsed groups", async () => {
      const user = userEvent.setup();
      renderGroupedMenu();

      await user.click(screen.getByTitle("Saved filters"));
      const lengthGroup = await screen.findByRole("group", { name: "Length" });
      expect(within(lengthGroup).getByRole("button", { name: "Over 1 hour" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1080p/4K" })).toBeInTheDocument();
      expect(screen.queryByRole("group", { name: "1080p" })).not.toBeInTheDocument();

      await user.click(within(lengthGroup).getByRole("button", { name: /Length/, expanded: true }));
      expect(within(lengthGroup).queryByRole("button", { name: "Over 1 hour" })).not.toBeInTheDocument();

      await user.keyboard("{Escape}");
      await user.click(screen.getByTitle("Saved filters"));
      const reopened = await screen.findByRole("group", { name: "Length" });
      expect(within(reopened).getByRole("button", { name: /Length/, expanded: false })).toBeInTheDocument();
      expect(within(reopened).queryByRole("button", { name: "Over 1 hour" })).not.toBeInTheDocument();

      // A search looks inside collapsed groups.
      await user.keyboard("hour");
      expect(
        within(screen.getByRole("group", { name: "Length" })).getByRole("button", { name: "Over 1 hour" }),
      ).toBeInTheDocument();
    });

    it("renames a filter inline into a group", async () => {
      vi.mocked(savedFilters.update).mockResolvedValue({ ...grouped[4], name: "Recent / Added" });
      const user = userEvent.setup();
      renderGroupedMenu();

      await user.click(screen.getByTitle("Saved filters"));
      await user.click(await screen.findByRole("button", { name: 'Rename saved filter "Recently added"' }));
      const input = screen.getByRole("textbox", { name: 'New name for saved filter "Recently added"' });
      expect(input).toHaveFocus();

      await user.clear(input);
      await user.type(input, "length / under 5 MIN");
      expect(screen.getByText("A saved filter with this name already exists.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: 'Save name for saved filter "Recently added"' })).toBeDisabled();

      await user.keyboard("{Escape}");
      expect(screen.getByRole("dialog", { name: "Saved filters" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Recently added" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: 'Rename saved filter "Recently added"' }));
      const again = screen.getByRole("textbox", { name: 'New name for saved filter "Recently added"' });
      await user.clear(again);
      await user.type(again, "  Recent / Added {Enter}");

      await waitFor(() => expect(savedFilters.update).toHaveBeenCalledWith(5, { name: "Recent / Added" }));
    });
  });

  describe("focus and keyboard edge cases", () => {
    const filters = [
      { id: 1, mode: "videos", name: "1080p/4K", findFilter: "{}" },
      { id: 2, mode: "videos", name: "Length / Over 1 hour", findFilter: '{"sort":"title"}' },
      { id: 3, mode: "videos", name: "Length / Under 5 min", findFilter: '{"sort":"duration"}' },
      { id: 4, mode: "videos", name: "Needs work / No tags", findFilter: '{"sort":"tag_count"}' },
      { id: 5, mode: "videos", name: "Recently added", findFilter: "{}" },
    ];

    function renderEdgeMenu() {
      vi.mocked(savedFilters.list).mockResolvedValue(filters);
      const onApplyFilter = vi.fn();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <SavedFilterMenu mode="videos" currentFilter={{ page: 1 }} onApplyFilter={onApplyFilter} />
        </QueryClientProvider>,
      );
      return onApplyFilter;
    }

    function moveTriggerOffscreen() {
      vi.spyOn(screen.getByTitle("Saved filters"), "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: -100,
        top: -100,
        bottom: -76,
        left: 0,
        right: 48,
        width: 48,
        height: 24,
        toJSON: () => ({}),
      });
      fireEvent.scroll(window);
    }

    it("still closes on desktop when the trigger scrolls away while the empty search is focused", async () => {
      const user = userEvent.setup();
      renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      await waitFor(() => expect(screen.getByRole("textbox", { name: "Search saved filters" })).toHaveFocus());
      moveTriggerOffscreen();

      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Saved filters" })).not.toBeInTheDocument());
      expect(screen.getByTitle("Saved filters")).toHaveFocus();
    });

    it("stays open when the trigger scrolls away while typing a search", async () => {
      const user = userEvent.setup();
      renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      await user.type(screen.getByRole("textbox", { name: "Search saved filters" }), "len");
      moveTriggerOffscreen();

      expect(await screen.findByRole("dialog", { name: "Saved filters" })).toBeInTheDocument();
    });

    it("does not focus the search on touch devices", async () => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("coarse"), media: query }));
      const user = userEvent.setup();
      renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      await screen.findByRole("button", { name: "Recently added" });

      expect(screen.getByRole("textbox", { name: "Search saved filters" })).not.toHaveFocus();
    });

    it("returns focus to the trigger when Escape closes the menu and to the search when a rename ends", async () => {
      const user = userEvent.setup();
      renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      const search = screen.getByRole("textbox", { name: "Search saved filters" });
      await waitFor(() => expect(search).toHaveFocus());
      await user.keyboard("{Escape}");
      expect(screen.getByTitle("Saved filters")).toHaveFocus();

      await user.click(screen.getByTitle("Saved filters"));
      await user.click(await screen.findByRole("button", { name: 'Rename saved filter "Recently added"' }));
      expect(screen.getByRole("textbox", { name: 'New name for saved filter "Recently added"' })).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(screen.getByRole("textbox", { name: "Search saved filters" })).toHaveFocus();

      // Saving an unchanged name just ends the rename.
      await user.click(screen.getByRole("button", { name: 'Rename saved filter "Recently added"' }));
      await user.keyboard("{Enter}");
      expect(savedFilters.update).not.toHaveBeenCalled();
      expect(screen.getByRole("textbox", { name: "Search saved filters" })).toHaveFocus();
    });

    it("does not pull focus back into a rename when its row reappears", async () => {
      const user = userEvent.setup();
      renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      await user.click(await screen.findByRole("button", { name: 'Rename saved filter "Recently added"' }));
      const search = screen.getByRole("textbox", { name: "Search saved filters" });
      await user.click(search);
      await user.keyboard("zz{Backspace}{Backspace}");

      expect(screen.getByRole("textbox", { name: 'New name for saved filter "Recently added"' })).toBeInTheDocument();
      expect(search).toHaveFocus();
    });

    it("keeps the highlight on the same filter when the list changes", async () => {
      vi.mocked(savedFilters.delete).mockResolvedValue(undefined);
      const user = userEvent.setup();
      const onApplyFilter = renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      await screen.findByRole("button", { name: "Recently added" });
      const search = screen.getByRole("textbox", { name: "Search saved filters" });
      await user.type(search, "e");
      await user.keyboard("{ArrowDown}");
      expect(search).toHaveAttribute("aria-activedescendant", screen.getByRole("button", { name: "Under 5 min" }).id);

      vi.mocked(savedFilters.list).mockResolvedValue(filters.filter((filter) => filter.id !== 2));
      await user.click(screen.getByRole("button", { name: 'Delete saved filter "Length / Over 1 hour"' }));
      await waitFor(() => expect(screen.queryByRole("button", { name: "Over 1 hour" })).not.toBeInTheDocument());
      await user.click(search);
      await user.keyboard("{Enter}");

      expect(onApplyFilter).toHaveBeenCalledWith(expect.objectContaining({ sort: "duration" }));
    });

    it("saves a rename from the check button and returns focus to the search", async () => {
      vi.mocked(savedFilters.update).mockResolvedValue({ ...filters[4], name: "Recent / Added" });
      const user = userEvent.setup();
      renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      await user.click(await screen.findByRole("button", { name: 'Rename saved filter "Recently added"' }));
      const input = screen.getByRole("textbox", { name: 'New name for saved filter "Recently added"' });
      await user.clear(input);
      await user.type(input, "Recent / Added");
      await user.click(screen.getByRole("button", { name: 'Save name for saved filter "Recently added"' }));

      await waitFor(() => expect(savedFilters.update).toHaveBeenCalledWith(5, { name: "Recent / Added" }));
      await waitFor(() => expect(screen.getByRole("textbox", { name: "Search saved filters" })).toHaveFocus());
    });

    it("does not highlight the filter being renamed", async () => {
      const user = userEvent.setup();
      renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      const search = screen.getByRole("textbox", { name: "Search saved filters" });
      await user.type(search, "len");
      await user.click(screen.getByRole("button", { name: 'Rename saved filter "Length / Over 1 hour"' }));
      await user.click(search);

      expect(search).toHaveAttribute("aria-activedescendant", screen.getByRole("button", { name: "Under 5 min" }).id);
    });

    it("ignores Enter and Escape while an input method is composing", async () => {
      const user = userEvent.setup();
      const onApplyFilter = renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      const search = screen.getByRole("textbox", { name: "Search saved filters" });
      await user.type(search, "len");
      fireEvent.keyDown(search, { key: "Enter", isComposing: true });
      fireEvent.keyDown(search, { key: "Escape", isComposing: true });

      expect(onApplyFilter).not.toHaveBeenCalled();
      expect(search).toHaveValue("len");
      expect(screen.getByRole("dialog", { name: "Saved filters" })).toBeInTheDocument();
    });

    it("names group headers and announces the match count for screen readers", async () => {
      const user = userEvent.setup();
      renderEdgeMenu();

      await user.click(screen.getByTitle("Saved filters"));
      expect(await screen.findByRole("button", { name: "Length, 2 filters", expanded: true })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Needs work, 1 filter", expanded: true })).toBeInTheDocument();

      await user.type(screen.getByRole("textbox", { name: "Search saved filters" }), "len");
      expect(screen.getByText("2 of 5 saved filters match")).toBeInTheDocument();
    });
  });
});

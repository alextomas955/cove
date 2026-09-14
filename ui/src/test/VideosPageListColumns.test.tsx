import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VideosPage } from "../pages/VideosPage";
import { DEFAULT_VIDEO_LIST_COLUMN_IDS, VIDEO_LIST_COLUMN_BY_ID } from "../components/videoListColumns";

vi.mock("../api/client", () => ({
  videos: {
    find: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, perPage: 40 }),
    findFiltered: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, perPage: 40 }),
    findWithCompilations: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, perPage: 40 }),
    aggregate: vi.fn().mockResolvedValue({ duration: 0, fileSize: 0 }),
    streamUrl: () => "",
    previewUrl: () => "",
    previewStatusUrl: () => "",
  },
  entityEngagement: { batch: vi.fn().mockResolvedValue([]) },
  entityImages: { videoCoverUrl: () => "" },
}));

vi.mock("../components/ListPage", () => ({
  ListPage: (props: Record<string, any>) => (
    <div
      data-testid="list-page"
      data-display-mode={props.displayMode}
      data-list-columns={JSON.stringify(props.savedFilterUIOptions?.listColumns ?? null)}
      data-list-column-widths={JSON.stringify(props.savedFilterUIOptions?.listColumnWidths ?? null)}
    >
      <button
        type="button"
        onClick={() =>
          props.onApplySavedFilterUIOptions?.({ displayMode: "list", listColumns: ["path", "bogus", "title"] })
        }
      >
        Apply columns
      </button>
      <button type="button" onClick={() => props.onApplySavedFilterUIOptions?.({ displayMode: "grid" })}>
        Apply without columns
      </button>
      {props.renderOperations?.()}
      {props.children}
    </div>
  ),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ hasPermission: () => true, user: { kind: "user" } }),
}));
vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: undefined }),
  useOptionalAppConfig: () => undefined,
}));
vi.mock("../state/VideoQueueContext", () => ({
  useVideoQueue: () => ({ setQueue: vi.fn() }),
}));
vi.mock("../hooks/useVisualSimilarityApi", () => ({ useVisualSimilarityApi: () => null }));
vi.mock("../hooks/useEntityEngagementBatch", () => ({
  useEntityEngagementBatch: () => ({ engagementById: new Map() }),
}));
vi.mock("../hooks/useVideoQueueNavigation", () => ({
  useVideoQueueNavigation: () => ({ openVideo: vi.fn(), navigateFromList: vi.fn() }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VideosPage onNavigate={vi.fn()} />
    </QueryClientProvider>,
  );
}

function listColumnWidths() {
  return JSON.parse(screen.getByTestId("list-page").getAttribute("data-list-column-widths") ?? "null");
}

function listColumns() {
  return JSON.parse(screen.getByTestId("list-page").getAttribute("data-list-columns") ?? "null");
}

describe("VideosPage list columns", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/videos");
  });

  it("omits default columns from saved-filter options and hides the picker outside list mode", () => {
    renderPage();
    expect(listColumns()).toBeNull();
    expect(screen.getByTestId("list-page")).toHaveAttribute("data-display-mode", "grid");
    expect(screen.queryByRole("button", { name: "Columns" })).toBeNull();
  });

  it("seeds columns from the default filter and drops unknown ids", () => {
    localStorage.setItem(
      "cove-default-filter-videos",
      JSON.stringify({
        findFilter: { page: 1, perPage: 40, sort: "date", direction: "desc" },
        objectFilter: {},
        uiOptions: { displayMode: "list", listColumns: ["title", "nope", "duration"] },
      }),
    );
    renderPage();
    expect(listColumns()).toEqual(["title", "duration"]);
    expect(screen.getByTestId("list-page")).toHaveAttribute("data-display-mode", "list");
    expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument();
  });

  it("applies saved-filter columns and resets when a filter has none", async () => {
    window.history.replaceState({}, "", "/videos?view=list");
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Apply columns" }));
    expect(listColumns()).toEqual(["path", "title"]);
    await user.click(screen.getByRole("button", { name: "Apply without columns" }));
    expect(listColumns()).toBeNull();
    await user.click(screen.getByRole("button", { name: "Columns" }));
    for (const id of DEFAULT_VIDEO_LIST_COLUMN_IDS) {
      expect(screen.getByRole("checkbox", { name: VIDEO_LIST_COLUMN_BY_ID.get(id)!.label })).toBeChecked();
    }
  });

  it("feeds picker changes back into the saved-filter options", async () => {
    window.history.replaceState({}, "", "/videos?view=list");
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await user.click(screen.getByRole("checkbox", { name: "Path" }));
    await waitFor(() => expect(listColumns()).toEqual([...DEFAULT_VIDEO_LIST_COLUMN_IDS, "path"]));
  });
});

describe("VideosPage list column widths", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/videos?view=list");
  });

  it("seeds widths from the default filter and clears them when a filter has none", async () => {
    localStorage.setItem(
      "cove-default-filter-videos",
      JSON.stringify({
        findFilter: { page: 1, perPage: 40, sort: "date", direction: "desc" },
        objectFilter: {},
        uiOptions: { displayMode: "list", listColumnWidths: { title: 320, bogus: 5 } },
      }),
    );
    renderPage();
    expect(listColumnWidths()).toEqual({ title: 320 });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Apply without columns" }));
    expect(listColumnWidths()).toBeNull();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoTagger } from "../components/VideoTagger";

const mocks = vi.hoisted(() => ({
  findMetadataServerByIds: vi.fn(),
  importFromMetadataServer: vi.fn(),
  searchMetadataServer: vi.fn(),
  listScrapers: vi.fn(),
  createScrapeAttempt: vi.fn(),
  resolveRelations: vi.fn(),
  videoObjectFit: "cover" as "cover" | "contain",
}));

vi.mock("../api/client", () => ({
  entityImages: { videoCoverUrl: vi.fn(() => "/video-cover.jpg") },
  system: { listScrapers: mocks.listScrapers },
  scrapeAttempts: { create: mocks.createScrapeAttempt, resolveRelations: mocks.resolveRelations },
  videos: {
    previewUrl: vi.fn(() => "/video-preview.mp4"),
    screenshotUrl: vi.fn(() => "/video-cover.jpg"),
    findMetadataServerByIds: mocks.findMetadataServerByIds,
    importFromMetadataServer: mocks.importFromMetadataServer,
    searchMetadataServer: mocks.searchMetadataServer,
  },
}));

vi.mock("../state/AppConfigContext", () => ({
  useOptionalAppConfig: () => undefined,
  useAppConfig: () => ({
    config: {
      scraping: {
        metadataServers: [
          { name: "First provider", endpoint: "https://first.example/graphql" },
          { name: "Second provider", endpoint: "https://second.example/graphql" },
        ],
      },
      ui: { videoObjectFit: mocks.videoObjectFit },
    },
  }),
}));

describe("VideoTagger", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    mocks.findMetadataServerByIds.mockReset();
    mocks.importFromMetadataServer.mockReset();
    mocks.searchMetadataServer.mockReset();
    mocks.listScrapers.mockReset();
    mocks.createScrapeAttempt.mockReset();
    mocks.resolveRelations.mockReset();
    mocks.videoObjectFit = "cover";
    mocks.importFromMetadataServer.mockResolvedValue({});
    mocks.searchMetadataServer.mockResolvedValue([]);
    mocks.listScrapers.mockResolvedValue([]);
    mocks.resolveRelations.mockResolvedValue({ tags: [], performers: [] });
    mocks.findMetadataServerByIds.mockResolvedValue([
      {
        id: "first-video-id",
        endpoint: "https://first.example/graphql",
        metadataServerName: "First provider",
        title: "First provider result",
        code: null,
        details: null,
        director: null,
        date: null,
        duration: 60,
        urls: [],
        images: [],
        studioName: null,
        studioCandidate: null,
        performerNames: [],
        performerCandidates: [],
        tagNames: [],
        tagCandidates: [],
        fingerprints: [],
        fingerprintAlgorithms: [],
      },
    ]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["cover", "contain"] as const)("renders the shared preview and scrub controls using %s fit", (fit) => {
    mocks.videoObjectFit = fit;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [{ duration: 60, basename: "video.mp4", path: "/library/video.mp4" }],
      performers: [],
      tags: [],
      urls: [],
      remoteIds: [],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} mode="detail" />
      </QueryClientProvider>,
    );

    const thumbnailLink = screen.getByTitle("Open video Local video");
    expect(thumbnailLink.querySelector(".video-card-preview-image")).toHaveStyle({ objectFit: fit });
    expect(thumbnailLink.querySelector(".video-card-preview-video")).toHaveAttribute("src", "/video-preview.mp4");
    expect(thumbnailLink.querySelector(".video-card-preview-video")).toHaveStyle({ objectFit: fit });
    expect(thumbnailLink.querySelector(".cursor-ew-resize")).toBeInTheDocument();
  });

  it("clears results when the metadata provider changes", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [{ duration: 60, basename: "video.mp4", path: "/library/video.mp4" }],
      performers: [],
      tags: [],
      urls: [],
      remoteIds: [{ endpoint: "https://first.example/graphql", remoteId: "first-video-id" }],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} mode="detail" />
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Refresh from First provider" }));
    expect((await screen.findAllByText("First provider result")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /^Apply \d+ changes?$/ })).toBeInTheDocument();
    // The compact facts open by default; the full side-by-side rows sit behind Adjust.
    expect(screen.queryByText(/Empty fields are filled from/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adjust…" }));
    expect(screen.getByText(/Empty fields are filled from/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done adjusting" }));
    expect(screen.queryByText(/Empty fields are filled from/)).not.toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getAllByRole("combobox").filter((element) => element.tagName === "SELECT")[0],
      "metadata-server:https://second.example/graphql",
    );

    await waitFor(() => expect(screen.queryAllByText("First provider result")).toHaveLength(0));
    expect(screen.queryByRole("button", { name: /^Apply/ })).not.toBeInTheDocument();
  });

  it("imports a result through the provider that returned it", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [{ duration: 60, basename: "video.mp4", path: "/library/video.mp4" }],
      performers: [],
      tags: [],
      urls: [],
      remoteIds: [{ endpoint: "https://first.example/graphql", remoteId: "first-video-id" }],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} mode="detail" />
      </QueryClientProvider>,
    );

    await userEvent.selectOptions(
      screen.getAllByRole("combobox").filter((element) => element.tagName === "SELECT")[0],
      "metadata-server:https://second.example/graphql",
    );
    await userEvent.click(screen.getByRole("button", { name: "Refresh from First provider" }));
    await userEvent.click(await screen.findByRole("button", { name: /^Apply/ }));

    await waitFor(() => expect(mocks.importFromMetadataServer).toHaveBeenCalledOnce());
    expect(mocks.importFromMetadataServer).toHaveBeenCalledWith(
      123,
      expect.objectContaining({
        endpoint: "https://first.example/graphql",
        videoId: "first-video-id",
      }),
    );
  });

  it("shows skipped related tag claims as a partial-success warning", async () => {
    mocks.importFromMetadataServer.mockResolvedValue({
      importWarnings: ["Skipped remote alias because it is already claimed by another tag."],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [{ duration: 60, basename: "video.mp4", path: "/library/video.mp4" }],
      performers: [],
      tags: [],
      urls: [],
      remoteIds: [{ endpoint: "https://first.example/graphql", remoteId: "first-video-id" }],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} mode="detail" />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Refresh from First provider" }));
    await userEvent.click(await screen.findByRole("button", { name: /^Apply/ }));

    expect(await screen.findByText(/Saved with warnings: Skipped remote alias/i)).toBeInTheDocument();
    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("can override Search all with fingerprint-only matching", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const videos = [
      { id: 123, title: "First local video", files: [], performers: [], tags: [], urls: [], remoteIds: [] },
      { id: 456, title: "Second local video", files: [], performers: [], tags: [], urls: [], remoteIds: [] },
    ] as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={videos} />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Choose search strategy" }));
    await userEvent.click(screen.getByRole("button", { name: /Fingerprint only/ }));

    await waitFor(() => expect(mocks.searchMetadataServer).toHaveBeenCalledTimes(2));
    expect(mocks.searchMetadataServer).toHaveBeenCalledWith(
      123,
      "First local video",
      "https://first.example/graphql",
      "fingerprint",
    );
    expect(mocks.searchMetadataServer).toHaveBeenCalledWith(
      456,
      "Second local video",
      "https://first.example/graphql",
      "fingerprint",
    );
  });

  it("saves and uses a default bulk match strategy", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [],
      performers: [],
      tags: [],
      urls: [],
      remoteIds: [],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "More tagger options" }));
    await userEvent.click(screen.getByTitle("Tagger settings"));
    await userEvent.selectOptions(screen.getByLabelText("Default bulk match strategy"), "remote-id");
    await userEvent.click(screen.getByRole("button", { name: "Save default" }));
    await userEvent.click(screen.getByRole("button", { name: "Search all" }));

    await waitFor(() => expect(mocks.searchMetadataServer).toHaveBeenCalledOnce());
    expect(mocks.searchMetadataServer).toHaveBeenCalledWith(
      123,
      "Local video",
      "https://first.example/graphql",
      "remote-id",
    );
    expect(JSON.parse(localStorage.getItem("cove-tagger-config") ?? "{}").bulkMatchStrategy).toBe("remote-id");
  });

  it("closes the toolbar menu on an outside click and on Escape", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [],
      performers: [],
      tags: [],
      urls: [],
      remoteIds: [],
    } as any;
    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} />
      </QueryClientProvider>,
    );
    const menu = screen.getByRole("button", { name: "More tagger options" }).closest("details")!;
    await userEvent.click(screen.getByRole("button", { name: "More tagger options" }));
    expect(menu.open).toBe(true);
    await userEvent.click(document.body);
    expect(menu.open).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "More tagger options" }));
    expect(menu.open).toBe(true);
    await userEvent.keyboard("{Escape}");
    expect(menu.open).toBe(false);
  });

  it("uses text only for the row search field", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [],
      performers: [],
      tags: [],
      urls: [],
      remoteIds: [],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} mode="detail" />
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByRole("textbox"), "{enter}");

    await waitFor(() => expect(mocks.searchMetadataServer).toHaveBeenCalledOnce());
    expect(mocks.searchMetadataServer).toHaveBeenCalledWith(
      123,
      "Local video",
      "https://first.example/graphql",
      undefined,
    );
  });

  it("rehydrates the saved bulk strategy and keeps the fingerprint row action strict", async () => {
    localStorage.setItem("cove-tagger-config", JSON.stringify({ bulkMatchStrategy: "remote-id-fingerprint" }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [],
      performers: [],
      tags: [],
      urls: [],
      remoteIds: [],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Search all" }));
    await waitFor(() =>
      expect(mocks.searchMetadataServer).toHaveBeenCalledWith(
        123,
        "Local video",
        "https://first.example/graphql",
        "remote-id-fingerprint",
      ),
    );

    mocks.searchMetadataServer.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(screen.getByTitle("Search by fingerprint only"));
    await waitFor(() =>
      expect(mocks.searchMetadataServer).toHaveBeenCalledWith(
        123,
        undefined,
        "https://first.example/graphql",
        "fingerprint",
      ),
    );
  });

  it("offers tags, performers and studio from a YAML scraper's object-shaped result", async () => {
    mocks.listScrapers.mockResolvedValue([
      {
        id: "pack/site:video",
        name: "Site Scraper",
        entityType: "video",
        supportedScrapes: ["url"],
        urls: ["site.example/watch/"],
        sourcePath: "",
      },
    ]);
    mocks.createScrapeAttempt.mockResolvedValue({
      id: "attempt-1",
      scraperId: "pack/site:video",
      entityType: "video",
      entityId: 123,
      inputKind: "url",
      status: "Success",
      error: null,
      candidateResultsJson: null,
      resultJson: JSON.stringify({
        Title: "Scraped title",
        URL: "https://site.example/watch/1",
        Tags: [
          { Name: "Countdown", URL: "https://site.example/tag/countdown" },
          { Name: "Edging" },
          { Name: "countdown" },
        ],
        Performers: [{ Name: "Scraped Performer", URL: "https://site.example/model/1" }],
        Studio: [{ Name: "Scraped Studio", URL: "https://site.example/store/1" }],
      }),
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const video = {
      id: 123,
      title: "Local video",
      files: [{ duration: 60, basename: "video.mp4", path: "/library/video.mp4" }],
      performers: [],
      tags: [],
      urls: ["https://site.example/watch/1"],
      remoteIds: [],
    } as any;

    render(
      <QueryClientProvider client={queryClient}>
        <VideoTagger videos={[video]} mode="detail" />
      </QueryClientProvider>,
    );

    await screen.findByRole("option", { name: "Site Scraper (Scraper)" });
    await userEvent.selectOptions(screen.getByRole("combobox"), "scraper:pack/site:video");
    await userEvent.type(screen.getByPlaceholderText("Video URL..."), "{Enter}");

    await waitFor(() => expect(mocks.createScrapeAttempt).toHaveBeenCalledOnce());
    // The compact review lists every scraped tag and performer as an added chip, deduplicated by name,
    // and the studio as a field that fills the empty current one.
    expect((await screen.findByText("Countdown")).closest("[data-state]")).toHaveAttribute("data-state", "new");
    expect(screen.getByText("Edging").closest("[data-state]")).toHaveAttribute("data-state", "new");
    expect(screen.queryByText("countdown")).not.toBeInTheDocument();
    expect(screen.getByText("Scraped Performer").closest("[data-state]")).toHaveAttribute("data-state", "new");
    const studio = screen.getByText("Studio").closest("[data-tone]")!;
    expect(studio).toHaveAttribute("data-tone", "ok");
    expect(within(studio as HTMLElement).getByText("Scraped Studio")).toBeInTheDocument();
  });
});

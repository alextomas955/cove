import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScraperSummary } from "../api/types";
import { IdentifyDialog } from "../components/IdentifyDialog";
import {
  DEFAULT_IDENTIFY_PREFERENCES,
  IDENTIFY_PREFERENCES_STORAGE_KEY,
  applySavedSources,
  loadIdentifyPreferences,
  type IdentifySource,
} from "../components/identifyPreferences";

const api = vi.hoisted(() => ({
  listScrapers: vi.fn(),
  identify: vi.fn(),
  metadataServers: [] as { name: string; endpoint: string }[],
}));

vi.mock("../api/client", () => ({
  system: { listScrapers: api.listScrapers },
  metadata: { identify: api.identify },
}));

vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: { scraping: { metadataServers: api.metadataServers } } }),
}));

function urlScraper(id: string, name: string): ScraperSummary {
  return { id, name, entityType: "Video", supportedScrapes: ["url"], urls: [], sourcePath: `/scrapers/${id}.yml` };
}

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const result = render(
    <QueryClientProvider client={client}>
      <IdentifyDialog open onClose={onClose} videoIds={[1]} />
    </QueryClientProvider>,
  );
  return { ...result, onClose };
}

const source = (id: string, enabled = true): IdentifySource => ({ id, name: id, type: "scraper", enabled });

describe("identify preferences", () => {
  afterEach(() => localStorage.removeItem(IDENTIFY_PREFERENCES_STORAGE_KEY));

  it("skips videos with multiple matches when nothing has been saved", () => {
    expect(loadIdentifyPreferences()).toEqual(DEFAULT_IDENTIFY_PREFERENCES);
    expect(DEFAULT_IDENTIFY_PREFERENCES.skipMultipleMatches).toBe(true);
  });

  it("keeps saved values and drops malformed ones", () => {
    localStorage.setItem(
      IDENTIFY_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        sources: [{ id: "scraper:a", enabled: true }, { id: 3 }, "junk"],
        skipMultipleMatches: false,
        markOrganized: "yes",
        createTags: false,
        fieldStrategies: { title: "overwrite", code: "replace" },
        performerGenders: ["Female", "Robot"],
      }),
    );
    expect(loadIdentifyPreferences()).toEqual({
      ...DEFAULT_IDENTIFY_PREFERENCES,
      sources: [{ id: "scraper:a", enabled: true }],
      skipMultipleMatches: false,
      createTags: false,
      fieldStrategies: { title: "overwrite" },
      performerGenders: ["Female"],
    });
  });

  it("falls back to the defaults when storage holds unreadable JSON", () => {
    localStorage.setItem(IDENTIFY_PREFERENCES_STORAGE_KEY, "{not json");
    expect(loadIdentifyPreferences()).toEqual(DEFAULT_IDENTIFY_PREFERENCES);
  });

  it("restores the saved order and state, and adds unseen sources switched off", () => {
    const available = [source("a"), source("b"), source("c"), source("new")];
    const saved = [
      { id: "c", enabled: true },
      { id: "gone", enabled: true },
      { id: "a", enabled: false },
      { id: "b", enabled: true },
    ];
    expect(applySavedSources(available, saved).map((s) => [s.id, s.enabled])).toEqual([
      ["c", true],
      ["a", false],
      ["b", true],
      ["new", false],
    ]);
  });

  it("starts every source switched off when nothing has been saved", () => {
    expect(applySavedSources([source("a"), source("b")], []).every((s) => !s.enabled)).toBe(true);
  });
});

describe("IdentifyDialog remembered choices", () => {
  beforeEach(() => {
    api.metadataServers = [{ name: "Box", endpoint: "https://box.example/graphql" }];
    api.listScrapers.mockResolvedValue([urlScraper("site-a", "Site A")]);
    api.identify.mockResolvedValue({ jobId: "job-1" });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(IDENTIFY_PREFERENCES_STORAGE_KEY);
    vi.clearAllMocks();
  });

  it("opens with no sources selected and skip-multiple-matches on", async () => {
    renderDialog();
    expect(await screen.findByRole("checkbox", { name: /Site A/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Box/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Identify" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    expect(screen.getByRole("checkbox", { name: "Skip videos with multiple matches" })).toBeChecked();
  });

  it("sends and remembers the last-used sources and options", async () => {
    const first = renderDialog();
    fireEvent.click(await screen.findByRole("checkbox", { name: /Site A/ }));
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Skip videos with multiple matches" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark identified videos as organized" }));
    fireEvent.click(screen.getByRole("button", { name: "Identify" }));

    await waitFor(() => expect(first.onClose).toHaveBeenCalled());
    expect(api.identify).toHaveBeenCalledWith(
      expect.objectContaining({ sources: ["Site A"], skipMultipleMatches: false, markOrganized: true }),
    );
    first.unmount();

    // A scraper installed since the last run is listed, but not used until the user opts in.
    api.listScrapers.mockResolvedValue([urlScraper("site-a", "Site A"), urlScraper("site-b", "Site B")]);
    renderDialog();
    expect(await screen.findByRole("checkbox", { name: /Site B/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Site A/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Box/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    expect(screen.getByRole("checkbox", { name: "Skip videos with multiple matches" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Mark identified videos as organized" })).toBeChecked();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SCRAPE_APPLY_PREFERENCES,
  loadScrapeApplyPreferences,
  resolveScrapeApplyDefaults,
  setServerScrapeApplyDefaults,
} from "../components/videoScrapeUtils";

const STORAGE_KEY = "cove.videoScrapePreferences";

describe("scrape apply defaults", () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    setServerScrapeApplyDefaults(null);
  });

  it("starts from the hard-coded defaults before the server config is known", () => {
    expect(resolveScrapeApplyDefaults()).toEqual(DEFAULT_SCRAPE_APPLY_PREFERENCES);
  });

  it("uses the Scraping defaults from Settings once the config has loaded", () => {
    setServerScrapeApplyDefaults({ createMissingPerformers: true, createMissingStudio: true });
    expect(resolveScrapeApplyDefaults()).toEqual({
      ...DEFAULT_SCRAPE_APPLY_PREFERENCES,
      createMissingPerformers: true,
      createMissingStudio: true,
    });
    expect(loadScrapeApplyPreferences().createMissingPerformers).toBe(true);
  });

  it("lets an explicit caller default and a remembered dialog choice override the server defaults", () => {
    setServerScrapeApplyDefaults({ createMissingPerformers: true, createMissingTags: true });
    expect(resolveScrapeApplyDefaults({ createMissingTags: false }).createMissingTags).toBe(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ createMissingPerformers: false }));
    const loaded = loadScrapeApplyPreferences();
    expect(loaded.createMissingPerformers).toBe(false);
    expect(loaded.createMissingTags).toBe(true);
  });
});

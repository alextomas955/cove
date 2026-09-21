import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionManifest } from "../api/types";
import { ExtensionLoaderProvider, useExtensions } from "../extensions/ExtensionLoader";

const THEME_STORAGE_KEY = "cove-active-theme";
const SELECTED_THEME_ID = "cinema-dark";

const mocks = vi.hoisted(() => ({
  getManifest: vi.fn(),
  updateUiPreferences: vi.fn(),
  troubleshootingModeEnabled: false,
  user: {
    id: "1",
    username: "tester",
    kind: "user" as const,
    permissions: ["*"],
    // Inlined rather than referencing SELECTED_THEME_ID: vi.hoisted runs before module consts.
    uiPreferences: { theme: { activeThemeId: "cinema-dark" } },
  },
}));

vi.mock("../api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("../api/client")>();
  return {
    ...original,
    extensions: { ...original.extensions, getManifest: mocks.getManifest },
  };
});

vi.mock("../utils/userUiPreferences", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils/userUiPreferences")>();
  return { ...original, updateAuthenticatedUserUiPreferences: mocks.updateUiPreferences };
});

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user, hasPermission: () => true }),
}));

vi.mock("../router/RouteRegistry", () => ({
  useRouteRegistry: () => ({
    register: vi.fn(),
    registerSlot: vi.fn(),
    unregister: vi.fn(),
    unregisterSlot: vi.fn(),
  }),
}));

vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: { ui: { troubleshootingModeEnabled: mocks.troubleshootingModeEnabled } } }),
}));

const OTHER_THEME_ID = "legacy";

// Fully typed on purpose: an `as unknown as ExtensionManifest` fixture would silently rot the day
// ExtensionManifest gains a required contribution array.
function buildManifest(): ExtensionManifest {
  return {
    extensionBundles: [],
    pages: [],
    slots: [],
    tabs: [],
    features: [],
    themes: [
      { id: SELECTED_THEME_ID, name: "Cinema Dark" },
      { id: OTHER_THEME_ID, name: "Legacy" },
    ],
    componentStyles: [],
    layoutStyles: [],
    settingsTabs: [],
    settingsPanels: [],
    componentOverrides: [],
    pageOverrides: [],
    dialogOverrides: [],
    actions: [],
    listFilters: [],
    listSorts: [],
  };
}

function ThemeProbe() {
  const { activeThemeId, loaded, refreshManifest, setActiveTheme } = useExtensions();
  return (
    <>
      <div data-testid="active-theme">{activeThemeId ?? "(none)"}</div>
      <div data-testid="loaded">{String(loaded)}</div>
      <button onClick={() => void refreshManifest()}>Refresh</button>
      <button onClick={() => setActiveTheme(OTHER_THEME_ID)}>Pick other theme</button>
    </>
  );
}

function renderLoader() {
  return render(
    <ExtensionLoaderProvider>
      <ThemeProbe />
    </ExtensionLoaderProvider>,
  );
}

describe("ExtensionLoaderProvider theme persistence", () => {
  beforeEach(() => {
    mocks.getManifest.mockReset();
    mocks.updateUiPreferences.mockReset();
    mocks.troubleshootingModeEnabled = false;
    localStorage.clear();
    localStorage.setItem(THEME_STORAGE_KEY, SELECTED_THEME_ID);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-theme");
    document.getElementById("cove-theme-override")?.remove();
  });

  it("keeps the selected theme when the manifest request fails", async () => {
    mocks.getManifest.mockRejectedValue(new Error("API Error 500: manifest unavailable"));

    renderLoader();

    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(SELECTED_THEME_ID);
    expect(mocks.updateUiPreferences).not.toHaveBeenCalled();
    expect(screen.getByTestId("active-theme")).toHaveTextContent(SELECTED_THEME_ID);
  });

  it("reapplies the selected theme once a later manifest request succeeds", async () => {
    mocks.getManifest.mockRejectedValueOnce(new Error("API Error 500: manifest unavailable"));
    mocks.getManifest.mockResolvedValue(buildManifest());

    renderLoader();

    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"));
    expect(document.documentElement).not.toHaveAttribute("data-theme");

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", SELECTED_THEME_ID));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(SELECTED_THEME_ID);
    expect(mocks.updateUiPreferences).not.toHaveBeenCalled();
  });

  it("keeps the selected theme while troubleshooting mode withdraws every extension", async () => {
    mocks.troubleshootingModeEnabled = true;
    mocks.getManifest.mockResolvedValue(buildManifest());

    renderLoader();

    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(SELECTED_THEME_ID);
    expect(mocks.updateUiPreferences).not.toHaveBeenCalled();
    expect(screen.getByTestId("active-theme")).toHaveTextContent(SELECTED_THEME_ID);
  });

  // This is the genuine-uninstall shape, not an outage, and it pins a deliberate trade-off: a theme
  // id whose extension is really gone is kept in storage forever rather than rewritten, because the
  // client cannot tell an uninstall from a transient absence. A dangling id costs nothing — every
  // reader of it is null-tolerant — so this is not a bug to "fix" by reinstating the reset.
  it("keeps the selected theme when the manifest contributes no themes at all", async () => {
    const manifest = buildManifest();
    manifest.themes = [];
    mocks.getManifest.mockResolvedValue(manifest);

    renderLoader();

    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(SELECTED_THEME_ID);
    expect(mocks.updateUiPreferences).not.toHaveBeenCalled();
    expect(screen.getByTestId("active-theme")).toHaveTextContent(SELECTED_THEME_ID);
  });

  // The refresh that superseded the initial load: `applyManifest` drops the stale response, so the
  // provider finishes loading with no manifest at all and every contributed theme withdrawn.
  it("keeps the selected theme when a failed refresh supersedes an in-flight initial load", async () => {
    let resolveInitialLoad: (manifest: ExtensionManifest) => void = () => {};
    const initialLoad = new Promise<ExtensionManifest>((resolve) => {
      resolveInitialLoad = resolve;
    });
    mocks.getManifest.mockReturnValueOnce(initialLoad);
    mocks.getManifest.mockRejectedValueOnce(new Error("API Error 500: manifest unavailable"));

    renderLoader();
    expect(screen.getByTestId("loaded")).toHaveTextContent("false");

    // Bumps the request generation while the first request is still outstanding.
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(mocks.getManifest).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveInitialLoad(buildManifest());
      await initialLoad;
    });

    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(SELECTED_THEME_ID);
    expect(mocks.updateUiPreferences).not.toHaveBeenCalled();
    expect(screen.getByTestId("active-theme")).toHaveTextContent(SELECTED_THEME_ID);
  });

  // Guards the other half of the contract: these tests assert that nothing writes the preference on
  // the user's behalf, which a no-op `setActiveTheme` would also satisfy. A real selection must
  // still persist.
  it("still persists a theme the user actually selects", async () => {
    mocks.getManifest.mockResolvedValue(buildManifest());

    renderLoader();
    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("true"));

    fireEvent.click(screen.getByRole("button", { name: "Pick other theme" }));

    await waitFor(() => expect(screen.getByTestId("active-theme")).toHaveTextContent(OTHER_THEME_ID));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(OTHER_THEME_ID);
    expect(mocks.updateUiPreferences).toHaveBeenCalledTimes(1);
  });
});

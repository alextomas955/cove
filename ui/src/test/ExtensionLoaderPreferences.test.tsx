import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExtensionLoaderProvider } from "../extensions/ExtensionLoader";
import { THEME_BOOT_STORAGE_KEY } from "../theme/themeBoot";

const mocks = vi.hoisted(() => ({
  user: {
    id: "1",
    username: "tester",
    kind: "user" as const,
    permissions: ["*"],
    uiPreferences: {
      theme: { activeThemeId: "cinema-dark" },
      defaultFilters: undefined as Record<string, string> | undefined,
    },
  },
  register: vi.fn(),
  registerSlot: vi.fn(),
  unregister: vi.fn(),
  unregisterSlot: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user, hasPermission: () => true }),
}));

vi.mock("../router/RouteRegistry", () => ({
  useRouteRegistry: () => ({
    register: mocks.register,
    registerSlot: mocks.registerSlot,
    unregister: mocks.unregister,
    unregisterSlot: mocks.unregisterSlot,
  }),
}));

vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: { ui: { troubleshootingModeEnabled: false } } }),
}));

vi.mock("../api/client", () => ({
  extensions: {
    getManifest: vi.fn().mockResolvedValue({
      pages: [],
      slots: [],
      tabs: [],
      features: [],
      themes: [
        {
          id: "cinema-dark",
          name: "Cinema Dark",
          componentStyle: "floating",
          layoutStyle: "detail-theater detail-tabs",
        },
      ],
      componentStyles: [],
      layoutStyles: [],
      settingsTabs: [],
      settingsPanels: [],
      pageOverrides: [],
      dialogOverrides: [],
      actions: [],
      listFilters: [],
      listSorts: [],
    }),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-component-style");
  document.documentElement.removeAttribute("data-layout");
  document.documentElement.removeAttribute("data-theme");
});

describe("ExtensionLoaderProvider preference synchronization", () => {
  it("does not temporarily reset theme styles when unrelated user preferences change", async () => {
    localStorage.setItem("cove-component-style", "floating");
    localStorage.setItem("cove-layout-style", "detail-theater detail-tabs");

    const view = render(
      <ExtensionLoaderProvider>
        <div>content</div>
      </ExtensionLoaderProvider>,
    );
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-component-style", "floating");
      expect(document.documentElement).toHaveAttribute("data-layout", "detail-theater detail-tabs");
    });

    const setAttribute = vi.spyOn(document.documentElement, "setAttribute");
    const removeAttribute = vi.spyOn(document.documentElement, "removeAttribute");

    mocks.user = {
      ...mocks.user,
      uiPreferences: {
        ...mocks.user.uiPreferences,
        defaultFilters: { videos: "{}" },
      },
    };
    view.rerender(
      <ExtensionLoaderProvider>
        <div>content</div>
      </ExtensionLoaderProvider>,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(setAttribute).not.toHaveBeenCalledWith("data-component-style", "default");
    expect(setAttribute).not.toHaveBeenCalledWith("data-layout", "default");
    expect(removeAttribute).not.toHaveBeenCalledWith("data-component-style");
    expect(removeAttribute).not.toHaveBeenCalledWith("data-layout");
  });
});

describe("ExtensionLoaderProvider boot cache", () => {
  // Without these the next load pre-paints the right colours with the wrong component and layout
  // styles, which is its own visible change.
  it("caches the component and layout styles a theme brought with it", async () => {
    render(
      <ExtensionLoaderProvider>
        <div>content</div>
      </ExtensionLoaderProvider>,
    );

    await waitFor(() => {
      const snapshot = JSON.parse(localStorage.getItem(THEME_BOOT_STORAGE_KEY) ?? "null");
      expect(snapshot).toMatchObject({
        themeId: "cinema-dark",
        componentStyle: "floating",
        layoutStyle: "detail-theater detail-tabs",
      });
    });
  });
});

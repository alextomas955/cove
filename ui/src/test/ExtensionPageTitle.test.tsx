import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App";
import { useDocumentTitle } from "../components/extension-shared";
import { ExtensionLoaderProvider } from "../extensions/ExtensionLoader";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", username: "reader", kind: "user" as const, permissions: [] },
    hasPermission: () => true,
  }),
}));

vi.mock("../router/RouteRegistry", () => ({
  useRouteRegistry: () => ({
    routes: [],
    register: vi.fn(() => vi.fn()),
    registerSlot: vi.fn(() => vi.fn()),
    unregister: vi.fn(),
    unregisterSlot: vi.fn(),
  }),
}));

vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: { ui: { title: "Cove", troubleshootingModeEnabled: false } } }),
}));

vi.mock("../api/client", () => ({
  extensions: {
    getManifest: vi.fn().mockResolvedValue({
      pages: [
        {
          route: "studio",
          label: "Studio",
          showInNav: true,
          navOrder: 10,
          extensionId: "studio-ext",
          componentName: "StudioPage",
        },
      ],
      slots: [],
      tabs: [],
      features: [],
      themes: [],
      componentStyles: [],
      layoutStyles: [],
      settingsTabs: [],
      settingsPanels: [],
      pageOverrides: [],
      dialogOverrides: [],
      actions: [],
      listFilters: [],
      listSorts: [],
      extensionBundles: [{ extensionId: "studio-ext", version: "1.0.0", jsBundleUrl: "/studio.mjs?v=1" }],
    }),
  },
}));

function StudioPage({ id }: { id?: number }) {
  useDocumentTitle(id === undefined ? undefined : `Item ${id}`);
  return <div>Studio page</div>;
}

afterEach(() => {
  document.title = "";
  delete document.body.dataset.covePageTitle;
});

describe("extension page titles", () => {
  it("titles an extension page with its label and puts a title the page sets in front of it", async () => {
    const importBundle = vi.fn().mockResolvedValue({ default: { components: { StudioPage } } });
    const { rerender } = render(
      <ExtensionLoaderProvider importBundle={importBundle}>
        <AppRoutes route={{ page: "studio" } as never} navigate={vi.fn()} />
      </ExtensionLoaderProvider>,
    );

    expect(await screen.findByText("Studio page")).toBeInTheDocument();
    expect(document.title).toBe("Studio | Cove");

    rerender(
      <ExtensionLoaderProvider importBundle={importBundle}>
        <AppRoutes route={{ page: "studio", id: 7 } as never} navigate={vi.fn()} />
      </ExtensionLoaderProvider>,
    );

    expect(document.title).toBe("Item 7 | Studio | Cove");
  });
});

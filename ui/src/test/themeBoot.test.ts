import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  THEME_BOOT_STORAGE_KEY,
  THEME_BOOT_VERSION,
  applyThemeBootSnapshot,
  bootTheme,
  clearThemeBootArtifacts,
  readThemeBootSnapshot,
  sanitizeThemeBootSnapshot,
  writeThemeBootSnapshot,
  type ThemeBootSnapshot,
} from "../theme/themeBoot";

function buildSnapshot(overrides: Partial<ThemeBootSnapshot> = {}): ThemeBootSnapshot {
  return {
    v: THEME_BOOT_VERSION,
    u: "1",
    themeId: "cinema-dark",
    colorScheme: "light",
    bgAnimation: "aurora",
    vars: { "--color-background": "#c5cad4", "--color-foreground": "#111827" },
    cssUrl: "/extensions/cinema/theme.css",
    componentStyle: "glass rounded",
    layoutStyle: "default",
    styleOptions: { glass: { cardblur: "40" } },
    ...overrides,
  };
}

function seed(snapshot: unknown, userId: string | null = "1") {
  localStorage.setItem(THEME_BOOT_STORAGE_KEY, typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot));
  if (userId !== null) localStorage.setItem("cove_user", JSON.stringify({ id: userId }));
}

describe("theme boot snapshot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearThemeBootArtifacts(document);
    document.documentElement.removeAttribute("data-component-style");
    document.documentElement.removeAttribute("data-layout");
    document.documentElement.removeAttribute("style");
    for (const key of Object.keys(document.documentElement.dataset)) {
      if (key.startsWith("style")) delete document.documentElement.dataset[key];
    }
  });

  it("round-trips a snapshot through storage and onto the document", () => {
    writeThemeBootSnapshot(buildSnapshot());
    const restored = readThemeBootSnapshot();
    expect(restored).toEqual(buildSnapshot());

    applyThemeBootSnapshot(document, restored!);

    const root = document.documentElement;
    expect(root).toHaveAttribute("data-theme", "cinema-dark");
    expect(root).toHaveAttribute("data-color-scheme", "light");
    expect(root).toHaveAttribute("data-theme-bg-animation", "aurora");
    expect(root).toHaveAttribute("data-component-style", "glass rounded");
    expect(root).toHaveAttribute("data-layout", "default");
    expect(root.dataset.styleGlassCardblur).toBe("40");
    expect(root.style.getPropertyValue("--sv-card-blur")).toBe("40");

    const style = document.getElementById("cove-theme-override");
    expect(style?.textContent).toContain("--color-background: #c5cad4;");
    // Stops a light theme flashing the dark literal fallback.
    expect(style?.textContent).toContain("background-color: #c5cad4;");
    expect(document.getElementById("cove-theme-css")).toHaveAttribute("href", "/extensions/cinema/theme.css");
  });

  // The canvas has to move with the theme: this is the colour the app's container paints.
  it("repaints the canvas with the theme's background", () => {
    applyThemeBootSnapshot(document, buildSnapshot({ vars: { "--color-background": "#0d1412" } }));

    const style = document.getElementById("cove-theme-override");
    // `html body` outweighs index.css's own body rule, which paints the shell palette underneath.
    expect(style?.textContent).toContain("html body {");
    expect(style?.textContent).toContain("background-color: #0d1412;");
  });

  it("omits the colour scheme and bg animation when the theme does not set them", () => {
    applyThemeBootSnapshot(document, buildSnapshot({ colorScheme: null, bgAnimation: null }));

    expect(document.documentElement).not.toHaveAttribute("data-color-scheme");
    expect(document.documentElement).not.toHaveAttribute("data-theme-bg-animation");
  });

  describe("rejects a snapshot that", () => {
    it.each([
      ["carries another schema version", buildSnapshot({ v: THEME_BOOT_VERSION + 1 })],
      ["closes the rule to inject a selector", buildSnapshot({ vars: { "--color-background": "red} html{" } })],
      ["ends the style element", buildSnapshot({ vars: { "--color-background": "</style><script>" } })],
      ["smuggles a second declaration", buildSnapshot({ vars: { "--color-background": "red; position: fixed" } })],
      ["names a variable oddly", buildSnapshot({ vars: { "color background": "red" } })],
      ["points at another origin", buildSnapshot({ cssUrl: "https://evil.example/x.css" })],
      ["points at a protocol-relative host", buildSnapshot({ cssUrl: "//evil.example/x.css" })],
      ["has a markup-bearing theme id", buildSnapshot({ themeId: "a<b>" })],
      ["carries an over-long value", buildSnapshot({ vars: { "--color-background": "a".repeat(121) } })],
      [
        "carries too many variables",
        buildSnapshot({
          vars: Object.fromEntries(Array.from({ length: 65 }, (_, index) => [`--color-${index}`, "red"])),
        }),
      ],
    ])("%s", (_label, snapshot) => {
      expect(sanitizeThemeBootSnapshot(snapshot)).toBeNull();
    });

    it("is not an object at all", () => {
      expect(sanitizeThemeBootSnapshot("nope")).toBeNull();
      expect(sanitizeThemeBootSnapshot(null)).toBeNull();
    });
  });

  it("survives a theme id that is namespaced the way extensions namespace them", () => {
    // Rejecting these silently turned the whole pre-paint off for that user, permanently.
    expect(sanitizeThemeBootSnapshot(buildSnapshot({ themeId: "com.acme.dark" }))).not.toBeNull();
  });

  it("keeps modern colour syntax but rejects a comment opener", () => {
    expect(
      sanitizeThemeBootSnapshot(buildSnapshot({ vars: { "--color-background": "rgb(0 0 0 / 50%)" } })),
    ).not.toBeNull();
    // An unterminated comment swallows the rest of the block, canvas rule included.
    expect(sanitizeThemeBootSnapshot(buildSnapshot({ vars: { "--color-background": "#16181d/*" } }))).toBeNull();
    expect(sanitizeThemeBootSnapshot(buildSnapshot({ vars: { "--color-background": "*/ x" } }))).toBeNull();
  });

  it("rejects style ids the dataset cannot hold", () => {
    // DOMStringMap throws on these, and the throw used to abort applying halfway.
    expect(sanitizeThemeBootSnapshot(buildSnapshot({ styleOptions: { "glass-pro": { blur: "40" } } }))).toBeNull();
    expect(sanitizeThemeBootSnapshot(buildSnapshot({ styleOptions: { glass: { "card blur": "40" } } }))).toBeNull();
  });

  it("rejects the whole snapshot when only one variable is unsafe", () => {
    const snapshot = buildSnapshot({ vars: { "--color-background": "#c5cad4", "--color-foreground": "red}" } });
    // Applying the safe half would leave unreadable text on a themed background.
    expect(sanitizeThemeBootSnapshot(snapshot)).toBeNull();
  });

  it("reads nothing back from malformed JSON", () => {
    seed("{");
    expect(readThemeBootSnapshot()).toBeNull();
  });

  it("survives storage that throws on read and on write", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(readThemeBootSnapshot()).toBeNull();
    expect(() => writeThemeBootSnapshot(buildSnapshot())).not.toThrow();
    expect(() => bootTheme()).not.toThrow();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("drops a snapshot that cannot be stored rather than leaving a stale one", () => {
    writeThemeBootSnapshot(buildSnapshot());
    writeThemeBootSnapshot(buildSnapshot({ themeId: "a<b>" }));

    expect(localStorage.getItem(THEME_BOOT_STORAGE_KEY)).toBeNull();
  });
});

describe("bootTheme", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    clearThemeBootArtifacts(document);
    document.documentElement.removeAttribute("data-component-style");
    document.documentElement.removeAttribute("data-layout");
  });

  it("applies a snapshot belonging to the signed-in user", () => {
    seed(buildSnapshot({ u: "1" }), "1");
    bootTheme();
    expect(document.documentElement).toHaveAttribute("data-theme", "cinema-dark");
  });

  it("applies an anonymous snapshot when nobody is signed in", () => {
    seed(buildSnapshot({ u: null }), null);
    bootTheme();
    expect(document.documentElement).toHaveAttribute("data-theme", "cinema-dark");
  });

  it("applies nothing when the snapshot belongs to another user", () => {
    seed(buildSnapshot({ u: "1" }), "2");
    bootTheme();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(document.getElementById("cove-theme-override")).toBeNull();
  });

  it("applies nothing when a signed-in user meets an anonymous snapshot", () => {
    seed(buildSnapshot({ u: null }), "2");
    bootTheme();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});

describe("handover", () => {
  afterEach(() => {
    clearThemeBootArtifacts(document);
    document.documentElement.removeAttribute("data-component-style");
    document.documentElement.removeAttribute("data-layout");
  });

  it("leaves attributes alone once ExtensionLoader owns the theme", () => {
    // The handover runs on its own dependencies and can fire after the theme effect has taken over.
    // Stripping data-theme then would unmatch every themed selector with nothing left to restore it.
    document.documentElement.setAttribute("data-theme", "react-owned");
    document.documentElement.setAttribute("data-color-scheme", "light");

    clearThemeBootArtifacts(document);

    expect(document.documentElement).toHaveAttribute("data-theme", "react-owned");
    expect(document.documentElement).toHaveAttribute("data-color-scheme", "light");
  });

  it("withdraws its own attributes and style-option properties", () => {
    applyThemeBootSnapshot(document, buildSnapshot({ styleOptions: { glass: { cardblur: "40" } } }));
    expect(document.documentElement.style.getPropertyValue("--sv-card-blur")).toBe("40");

    clearThemeBootArtifacts(document);

    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(document.documentElement.dataset.styleGlassCardblur).toBeUndefined();
    expect(document.documentElement.style.getPropertyValue("--sv-card-blur")).toBe("");
  });
});

describe("clearThemeBootArtifacts", () => {
  afterEach(() => {
    document.getElementById("cove-theme-override")?.remove();
  });

  it("leaves an override React already owns alone", () => {
    applyThemeBootSnapshot(document, buildSnapshot());
    document.getElementById("cove-theme-override")!.remove();

    const reactOwned = document.createElement("style");
    reactOwned.id = "cove-theme-override";
    reactOwned.textContent = ":root {}";
    document.head.appendChild(reactOwned);

    clearThemeBootArtifacts(document);

    expect(document.getElementById("cove-theme-override")).toBe(reactOwned);
    // The boot-owned stylesheet link still goes.
    expect(document.getElementById("cove-theme-css")).toBeNull();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});

// Outside src/ on purpose: it reads the repo from disk and compiles the boot bundle, like the build
// scripts it exercises, which the app's tsconfig also excludes.
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { compileThemeBootScript, themeBootMaxBytes } from "../scripts/theme-boot";
import {
  FALLBACK_DEFAULT_THEME,
  THEME_BOOT_STORAGE_KEY,
  THEME_BOOT_VERSION,
  applyThemeBootSnapshot,
  clearThemeBootArtifacts,
  type ThemeBootSnapshot,
} from "../src/theme/themeBoot";

const uiRoot = path.resolve(import.meta.dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(uiRoot, relative), "utf8");

const indexHtml = read("index.html");
const indexCss = read("src/index.css");

describe("the canvas colour is spelled the same in all three places", () => {
  // What fills the viewport is the app's full-height `bg-background` container, so the pre-paint has
  // to use --color-background. `body`'s own --color-shell-bg is never visible, and pre-painting it
  // made every theme that leaves the shell alone flash blue-grey before settling.
  const background = FALLBACK_DEFAULT_THEME.cssVariables!["--color-background"];
  const foreground = FALLBACK_DEFAULT_THEME.cssVariables!["--color-foreground"];

  it("matches the inline style in index.html", () => {
    const inlineStyle = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1];
    expect(inlineStyle).toBeTruthy();
    expect(inlineStyle).toContain(`background-color: ${background};`);
    expect(inlineStyle).toContain(`color: ${foreground};`);
  });

  it("matches the @theme block in index.css", () => {
    expect(indexCss).toContain(`--color-background: ${background};`);
    expect(indexCss).toContain(`--color-foreground: ${foreground};`);
  });

  it("is what index.css paints html with", () => {
    // html must track the container's variable, or the overscroll area sits on a different colour.
    expect(indexCss).toContain("html {\n  background-color: var(--color-background);\n}");
  });
});

describe("index.html cannot drift back into flashing", () => {
  it("colours the canvas itself instead of relying on Tailwind utilities", () => {
    // `bg-gray-950` only exists inside the CSS bundle, so it painted nothing until that arrived.
    expect(indexHtml).not.toContain("bg-gray-950");
    expect(indexHtml).not.toContain("text-gray-100");
    expect(indexHtml).not.toContain('class="dark"');
    expect(indexHtml).toMatch(/<style>[\s\S]*background-color:/);
  });
});

describe("the stylesheet stays on the synchronous entry", () => {
  it("is imported by main.tsx and not by mount.tsx", () => {
    // Reached only through ./mount the CSS lands in an async chunk, Vite emits no <link>, and the
    // first paint is unstyled white.
    expect(read("src/main.tsx")).toContain('import "./index.css";');
    expect(read("src/mount.tsx")).not.toContain("index.css");
  });
});

describe("the compiled boot script", () => {
  let code: string;

  beforeAll(async () => {
    code = await compileThemeBootScript();
  }, 60_000);

  afterEach(() => {
    clearThemeBootArtifacts(document);
    document.documentElement.removeAttribute("data-component-style");
    document.documentElement.removeAttribute("data-layout");
    localStorage.clear();
  });

  it("is self-contained, eval-free and within budget", () => {
    expect(code).not.toMatch(/\bimport\s*[({*'"]/);
    expect(code).not.toMatch(/\bexport\b/);
    expect(code).not.toContain("eval(");
    expect(code).not.toContain("new Function");
    expect(Buffer.byteLength(code, "utf8")).toBeLessThanOrEqual(themeBootMaxBytes);
  });

  // Attribute order is not meaningful, so compare state rather than markup.
  const paintedState = () => ({
    attributes: Object.fromEntries(
      Array.from(document.documentElement.attributes)
        .map((attribute) => [attribute.name, attribute.value] as const)
        .sort(([left], [right]) => (left < right ? -1 : 1)),
    ),
    head: document.head.innerHTML,
  });

  it("paints exactly what applyThemeBootSnapshot paints", () => {
    const snapshot: ThemeBootSnapshot = {
      v: THEME_BOOT_VERSION,
      u: "7",
      themeId: "cinema-dark",
      colorScheme: "light",
      bgAnimation: "aurora",
      vars: { "--color-background": "#c5cad4", "--color-foreground": "#111827" },
      cssUrl: "/extensions/cinema/theme.css",
      componentStyle: "glass",
      layoutStyle: "default",
      styleOptions: { glass: { cardblur: "40" } },
    };

    applyThemeBootSnapshot(document, snapshot);
    const expected = paintedState();
    clearThemeBootArtifacts(document);

    localStorage.setItem(THEME_BOOT_STORAGE_KEY, JSON.stringify(snapshot));
    localStorage.setItem("cove_user", JSON.stringify({ id: "7" }));
    new Function(code)();

    expect(paintedState()).toEqual(expected);
  });
});

// Outside src/ on purpose: it reads the repo from disk and compiles the boot bundle, like the build
// scripts it exercises, which the app's tsconfig also excludes.
import fs from "node:fs";
import os from "node:os";
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

  it("defines the base rules exactly once", () => {
    // index.css shipped with tailwind imported twice, two @theme blocks and two competing `body`
    // rules whose later copy silently won, so editing the first had no effect. That is what hid the
    // canvas variable mix-up above; keep the base declarations single.
    const once = (pattern: RegExp) => (indexCss.match(pattern) ?? []).length;
    expect(once(/^@import "tailwindcss";$/gm)).toBe(1);
    expect(once(/^@theme \{$/gm)).toBe(1);
    expect(once(/^body \{$/gm)).toBe(1);
  });

  it("paints body with the same variable as html", () => {
    // body sits under the app's container, so a different variable here shows only while the page is
    // loading and in the overscroll area -- which is exactly where the wrong colour was visible.
    expect(indexCss).toContain("body {\n  background-color: var(--color-background);");
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

describe("the emitted document", () => {
  // The entire fix rests on the inline script running before the stylesheet: a classic script placed
  // after a <link rel=stylesheet> does not execute until that sheet has downloaded, which on a slow
  // connection delays the theme by the whole CSS download. Vite appends its asset tags to <head>, so
  // the marker in index.html is what keeps the script ahead of them. Nothing else pins that, and a
  // Vite upgrade that switched to prepending would undo the fix with every other test still green.
  it("runs the boot script before the stylesheet it must not wait for", async () => {
    const { build } = await import("vite");
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "cove-theme-boot-"));
    try {
      await build({ root: uiRoot, logLevel: "silent", build: { outDir, emptyOutDir: true, write: true } });
      const html = fs.readFileSync(path.join(outDir, "index.html"), "utf8");

      const script = html.indexOf("cove-theme-boot");
      const stylesheet = html.indexOf('rel="stylesheet"');
      expect(script).toBeGreaterThan(-1);
      expect(stylesheet).toBeGreaterThan(-1);
      expect(script).toBeLessThan(stylesheet);
      // Classic and parser-blocking: a module script is deferred and would run after the first paint.
      expect(html).not.toMatch(/<script[^>]*type="module"[^>]*>\(function\(\)/);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }, 180_000);
});

import { describe, expect, it } from "vitest";
import {
  BUILT_IN_PATTERNS,
  MAX_INLINE_SVG_BYTES,
  MAX_SAVED_PATTERNS,
  MAX_UPLOADED_SVG_BYTES,
  applyPatternCss,
  cssPatternIsScalable,
  parsePatternInput,
  parseSvgFile,
  patternKey,
  readSavedPatterns,
  rememberPattern,
  resolveRecommendedPatternOptions,
  svgWidth,
} from "../theme/patternSource";
import { applyStyleOption, patternCssImage } from "../theme/themeBoot";

// Hero Patterns' "Copy CSS" output, verbatim shape: a colour line, then a url() with single-quoted SVG attributes.
const HERO_PATTERNS_SNIPPET = `background-color: #DFDBE5;
background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");`;

describe("parsePatternInput", () => {
  it("takes the image out of a pasted Hero Patterns CSS snippet and reads its tile width", () => {
    const result = parsePatternInput(HERO_PATTERNS_SNIPPET);

    expect(result).toMatchObject({ ok: true, source: { kind: "svg", width: 60 } });
    expect(result.ok === true && result.source.url.startsWith("data:image/svg+xml,%3Csvg width='60'")).toBe(true);
  });

  it("encodes raw SVG markup as an inline data URI", () => {
    const result = parsePatternInput(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><path d="M0 0h1"/></svg>`,
    );

    expect(result).toMatchObject({ ok: true, source: { kind: "svg", width: 40 } });
    // The markup's double quotes are percent-encoded, so the url("...") wrapper stays intact.
    expect(result.ok === true && result.source.url.includes('"')).toBe(false);
  });

  it("classifies plain links by extension", () => {
    expect(parsePatternInput("https://example.com/tile.svg?v=2")).toMatchObject({ ok: true, source: { kind: "svg" } });
    expect(parsePatternInput("https://example.com/photo.jpg")).toMatchObject({ ok: true, source: { kind: "image" } });
    expect(parsePatternInput("/api/system/ui-assets/background-1.png")).toMatchObject({
      ok: true,
      source: { kind: "image" },
    });
  });

  it("explains what it needs when the input holds no image", () => {
    expect(parsePatternInput("")).toMatchObject({ ok: false });
    expect(parsePatternInput("just some words")).toMatchObject({ ok: false });
    expect(parsePatternInput("javascript:alert(1)")).toMatchObject({ ok: false });
  });

  it("sends inline raster data to upload instead of storing it in preferences", () => {
    expect(parsePatternInput("data:image/png;base64,iVBORw0KGgo=")).toMatchObject({ ok: false });
  });

  it("hands SVGs too large to keep inline to the uploader, keeping their tile width", () => {
    const large = `<svg xmlns='http://www.w3.org/2000/svg' width='10'><path d='${"M0 0".repeat(MAX_INLINE_SVG_BYTES)}'/></svg>`;
    expect(parseSvgFile(large)).toMatchObject({ ok: "upload", svg: large, width: 10 });
  });

  it("rejects SVGs over the upload limit", () => {
    const huge = `<svg xmlns='http://www.w3.org/2000/svg'><path d='${"M0 0".repeat(MAX_UPLOADED_SVG_BYTES / 4 + 1)}'/></svg>`;
    expect(parseSvgFile(huge)).toMatchObject({ ok: false });
  });
});

// css-pattern.com's output, verbatim shape: a rule on html with size and colour variables and a
// multi-layer gradient background.
const CSS_PATTERN_SNIPPET = `html {
  --s: 80px; /* control the size*/
  --c1: #5e8c6a;
  --c2: #bfb35a;

  --_s: calc(2*var(--s)) calc(2*var(--s));
  --_g: 35.36% 35.36% at;
  --_c: #0000 66%,var(--c2) 68% 70%,#0000 72%;
  background:
    radial-gradient(var(--_g) 100% 25%,var(--_c)) var(--s) var(--s)/var(--_s),
    radial-gradient(var(--_g) 0    75%,var(--_c)) var(--s) var(--s)/var(--_s),
    repeating-conic-gradient(var(--c1) 0 25%,#0000 0 50%) 0 0/var(--_s),
    radial-gradient(var(--_c)) 0 calc(var(--s)/2)/var(--s) var(--s)
    var(--c1);
}`;

describe("CSS gradient patterns", () => {
  it("keeps a css-pattern.com rule's variables and background, wiring its size to Scale", () => {
    const result = parsePatternInput(CSS_PATTERN_SNIPPET);

    expect(result).toMatchObject({ ok: true, source: { kind: "css", url: "" } });
    const css = result.ok === true ? (result.source.css ?? "") : "";
    expect(css).toContain("--s:calc(80px * var(--sv-pattern-scale, 100) / 100)");
    expect(css).toContain("--c1:#5e8c6a");
    expect(css).toMatch(/background:radial-gradient\(/);
    expect(css).not.toContain("/*");
    expect(cssPatternIsScalable(css)).toBe(true);
  });

  it("refuses CSS that could escape the pattern rule or load something", () => {
    expect(parsePatternInput("background: linear-gradient(red, blue); --x: } body { display:none")).toMatchObject({
      ok: false,
    });
    expect(parsePatternInput("background: linear-gradient(red, blue), url(https://evil.example/x.png)")).toMatchObject({
      ok: true,
      source: { kind: "image" },
    });
    expect(parsePatternInput("color: red; background: linear-gradient(red, blue)")).toMatchObject({
      ok: true,
      source: { kind: "css", css: "background:linear-gradient(red, blue)" },
    });
  });

  it("injects the declarations as one rule, and nothing that could break out of it", () => {
    applyPatternCss(document, "--c1:#5e8c6a;background:linear-gradient(red, blue)");
    expect(document.getElementById("cove-pattern-css")?.textContent).toContain(
      '[data-style-pattern-sourcekind="css"] .cove-app-shell::before{--c1:#5e8c6a;background:linear-gradient(red, blue)}',
    );

    applyPatternCss(document, "background:red} body{display:none");
    expect(document.getElementById("cove-pattern-css")).toBeNull();

    applyPatternCss(document, "");
    expect(document.getElementById("cove-pattern-css")).toBeNull();
  });

  it("saves CSS patterns by their CSS, not their empty URL", () => {
    const a = { url: "", kind: "css" as const, css: "background:linear-gradient(red, blue)" };
    const b = { url: "", kind: "css" as const, css: "background:linear-gradient(green, blue)" };
    expect(rememberPattern(rememberPattern([], a), b)).toHaveLength(2);
    expect(patternKey(a)).not.toBe(patternKey(b));
  });
});

describe("texture snippets", () => {
  it("takes only the texture, so it sits on the theme's background rather than the site's preview colour", () => {
    const snippet = `background-color: #8a005e;
background-image: url("https://transparenttextures.com/patterns/argyle.png");
/* This is mostly intended for prototyping; please download the pattern and re-host for production environments. Thank you! */`;

    const result = parsePatternInput(snippet);
    expect(result).toMatchObject({
      ok: true,
      source: { kind: "image", url: "https://transparenttextures.com/patterns/argyle.png" },
    });
    expect(result.ok === true && JSON.stringify(result.source)).not.toContain("8a005e");
  });
});

describe("theme recommendations", () => {
  it("fills in a built-in shape named by kind", async () => {
    const patch = await resolveRecommendedPatternOptions(
      { kind: "hex", tint: "white", opacity: "4", scale: "175" },
      {},
    );
    const hex = BUILT_IN_PATTERNS.find((pattern) => pattern.id === "hex")!;

    expect(patch).toMatchObject({
      kind: "hex",
      source: hex.url,
      sourcekind: "svg",
      sourcewidth: "42",
      opacity: "4",
      scale: "175",
    });
    // Options the theme does not mention are reset rather than carried over from the last pattern.
    expect(patch).toMatchObject({ keepcolors: "off", dim: "0", css: "" });
  });

  it("adds a recommended custom source to My patterns", async () => {
    const current = { library: JSON.stringify([{ url: "/old.png", kind: "image" }]) };
    const patch = await resolveRecommendedPatternOptions(
      {
        kind: "custom",
        source: "/patterns/sakura-branches.svg",
        sourcekind: "svg",
        sourcewidth: "480",
        keepcolors: "on",
      },
      current,
    );

    expect(readSavedPatterns(patch.library).map((entry) => entry.url)).toEqual([
      "/patterns/sakura-branches.svg",
      "/old.png",
    ]);
    expect(patch.keepcolors).toBe("on");
  });
});

describe("svgWidth", () => {
  it("prefers the width attribute, then the viewBox width", () => {
    expect(svgWidth("<svg width='84' height='48'>")).toBe(84);
    expect(svgWidth('<svg width="12.5px">')).toBe(12.5);
    expect(svgWidth('<svg viewBox="0 0 30 10">')).toBe(30);
    expect(svgWidth("<svg>")).toBeUndefined();
  });
});

describe("saved patterns", () => {
  it("moves a reused pattern to the front and keeps the list bounded", () => {
    const many = Array.from({ length: MAX_SAVED_PATTERNS }, (_, i) => ({ url: `/p${i}.png`, kind: "image" as const }));
    const next = rememberPattern(many, { url: "/p3.png", kind: "image" });

    expect(next[0].url).toBe("/p3.png");
    expect(next).toHaveLength(MAX_SAVED_PATTERNS);
    expect(next.filter((entry) => entry.url === "/p3.png")).toHaveLength(1);
  });

  it("ignores malformed stored lists", () => {
    expect(readSavedPatterns("not json")).toEqual([]);
    expect(readSavedPatterns(JSON.stringify([{ url: 1 }, { url: "/a.png", kind: "image" }]))).toEqual([
      { url: "/a.png", kind: "image" },
    ]);
  });
});

describe("applyStyleOption for patterns", () => {
  it("drives the stylesheet's custom properties without copying image data into attributes", () => {
    const root = document.createElement("html");
    const dots = BUILT_IN_PATTERNS[0];

    applyStyleOption(root, "pattern", "source", dots.url);
    applyStyleOption(root, "pattern", "sourcewidth", "24");
    applyStyleOption(root, "pattern", "sourcekind", "svg");

    expect(root.style.getPropertyValue("--sv-pattern-custom-image")).toBe(patternCssImage(dots.url));
    expect(root.style.getPropertyValue("--sv-pattern-custom-tile")).toBe("24px");
    expect(root.dataset.stylePatternSourcekind).toBe("svg");
    expect(root.dataset.stylePatternSource).toBeUndefined();

    applyStyleOption(root, "pattern", "source", "");
    expect(root.style.getPropertyValue("--sv-pattern-custom-image")).toBe("");
  });
});

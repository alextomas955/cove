/**
 * Custom backgrounds for the Pattern style. Users paste whatever a pattern site gives them -- a URL,
 * a CSS snippet such as Hero Patterns' `background-image: url("data:image/svg+xml,...")`, a pure-CSS
 * gradient pattern such as css-pattern.com's, or raw `<svg>` markup -- or upload a file.
 *
 * Small SVGs are kept inline (a data URI in the user's theme preferences) and treated as a tintable
 * pattern; larger SVGs and photos are uploaded to the server. CSS patterns are kept as their
 * declarations and painted in their own colours.
 */

export type PatternSourceKind = "svg" | "image" | "css";

export interface PatternSource {
  /** A URL safe to place inside `url("...")`: https, a same-origin path, or a data URI. Empty for CSS. */
  url: string;
  kind: PatternSourceKind;
  /** Natural tile width in CSS px, when known; Scale multiplies it. */
  width?: number;
  /** For kind "css": sanitised declarations for the pattern layer. */
  css?: string;
}

export type PatternParseResult =
  | { ok: true; source: PatternSource }
  | { ok: false; error: string }
  /** An SVG too large to keep inline: upload `svg` and use the returned path. */
  | { ok: "upload"; svg: string; width?: number };

/**
 * Built-in patterns. Drawn in black on transparent: they are used as masks, so only their shape
 * matters and the Tint option colours them. Choosing one stores its data URI like any custom SVG,
 * so the stylesheet and the boot script have a single code path.
 */
const BUILT_IN_PATTERN_MARKUP: { id: string; label: string; width: number; height: number; body: string }[] = [
  { id: "dots", label: "Dots", width: 24, height: 24, body: "<circle cx='12' cy='12' r='1.5'/>" },
  { id: "grid", label: "Grid", width: 32, height: 32, body: "<path d='M0 .5H32M.5 0V32' fill='none' stroke='black'/>" },
  {
    id: "diagonal",
    label: "Diagonal",
    width: 12,
    height: 12,
    body: "<path d='M-1 1L1-1M0 12L12 0M11 13L13 11' stroke='black'/>",
  },
  {
    id: "crosshatch",
    label: "Crosshatch",
    width: 16,
    height: 16,
    body: "<path d='M0 0L16 16M16 0L0 16' stroke='black'/>",
  },
  {
    // Flat-top honeycomb with side 14: one hexagon plus the two horizontal edges that join it to its
    // neighbours. The tile is 3 sides wide and sqrt(3) sides tall, so the edges meet exactly.
    id: "hex",
    label: "Hexagons",
    width: 42,
    height: 24.2487,
    body: "<path d='M7 12.1244L14 0H28L35 12.1244L28 24.2487H14ZM0 12.1244H7M35 12.1244H42' fill='none' stroke='black'/>",
  },
  {
    id: "triangles",
    label: "Triangles",
    width: 32,
    height: 32,
    body: "<path d='M16 3L29 27H3Z' fill='none' stroke='black'/>",
  },
  {
    id: "waves",
    label: "Waves",
    width: 80,
    height: 20,
    body: "<path d='M0 10C20 0 20 20 40 10S60 0 80 10' fill='none' stroke='black'/>",
  },
  {
    id: "rings",
    label: "Rings",
    width: 48,
    height: 48,
    body: "<circle cx='24' cy='24' r='14' fill='none' stroke='black'/>",
  },
  { id: "plus", label: "Plus", width: 24, height: 24, body: "<path d='M12 7V17M7 12H17' stroke='black'/>" },
];

export const BUILT_IN_PATTERNS: ({ id: string; label: string } & PatternSource)[] = BUILT_IN_PATTERN_MARKUP.map(
  ({ id, label, width, height, body }) => ({
    id,
    label,
    kind: "svg",
    width,
    url: `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${body}</svg>`,
    )}`,
  }),
);

/** Inline SVGs live in the user's preferences, which every page load reads, so they stay small. */
export const MAX_INLINE_SVG_BYTES = 48 * 1024;

/** How many custom backgrounds "My patterns" keeps. */
export const MAX_SAVED_PATTERNS = 8;

const URL_IN_CSS = /url\(\s*(["']?)([\s\S]*?)\1\s*\)/i;

/** Uploaded SVGs are drawn on every page; the server enforces the same cap. */
export const MAX_UPLOADED_SVG_BYTES = 2 * 1024 * 1024;

/**
 * Parses pasted text: SVG markup, a CSS declaration or block containing `url(...)`, a pure-CSS
 * gradient pattern, or a URL.
 */
export function parsePatternInput(input: string): PatternParseResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "Paste a link, a CSS snippet, or SVG code." };

  if (/^(<\?xml[\s\S]*?)?<svg[\s>]/i.test(text)) {
    return fromSvgMarkup(text);
  }

  // A snippet's background-color is ignored: it is the site's preview colour, and the texture is
  // meant to sit on the theme's own background.
  const fromCss = URL_IN_CSS.exec(text);
  if (fromCss) return fromUrl(fromCss[2].trim());
  if (/gradient\s*\(/i.test(text)) return fromGradientCss(text);
  return fromUrl(text);
}

/** An SVG file the user picked, read as text and kept inline. */
export function parseSvgFile(markup: string): PatternParseResult {
  return fromSvgMarkup(markup.trim());
}

function fromSvgMarkup(markup: string): PatternParseResult {
  if (!/<svg[\s>]/i.test(markup)) return { ok: false, error: "That doesn't look like SVG code." };
  return finishSvg(`data:image/svg+xml,${encodeURIComponent(markup)}`, markup);
}

function fromUrl(raw: string): PatternParseResult {
  // A URL cannot legitimately contain these unescaped; encoding them keeps the url("...") wrapper intact.
  const url = raw
    .replace(/\s*[\r\n]+\s*/g, "")
    .replace(/"/g, "%22")
    .replace(/\\/g, "%5C");

  if (/^data:image\/svg\+xml/i.test(url)) {
    const markup = decodeSvgDataUri(url);
    if (markup === null) return { ok: false, error: "That SVG data couldn't be read." };
    return finishSvg(url, markup);
  }
  if (/^data:image\/(png|jpe?g|webp|gif|avif)[;,]/i.test(url)) {
    return {
      ok: false,
      error: "Upload image files instead of pasting them as data — they're too large to store inline.",
    };
  }
  if (/^https?:\/\/\S+$/i.test(url) || /^\/(?!\/)\S*$/.test(url)) {
    const path = url.split(/[?#]/, 1)[0];
    return { ok: true, source: { url, kind: /\.svg$/i.test(path) ? "svg" : "image" } };
  }
  return {
    ok: false,
    error: "Couldn't find an image in that. Paste a link, a CSS snippet with url(...), or SVG code.",
  };
}

function finishSvg(url: string, markup: string): PatternParseResult {
  const width = svgWidth(markup);
  if (new TextEncoder().encode(url).length > MAX_INLINE_SVG_BYTES) {
    if (new TextEncoder().encode(markup).length > MAX_UPLOADED_SVG_BYTES) {
      return { ok: false, error: `That SVG is over ${MAX_UPLOADED_SVG_BYTES / (1024 * 1024)} MB.` };
    }
    return width ? { ok: "upload", svg: markup, width } : { ok: "upload", svg: markup };
  }
  return { ok: true, source: width ? { url, kind: "svg", width } : { url, kind: "svg" } };
}

const CSS_PATTERN_PROPERTY = /^(--[\w-]+|background(-(color|image|size|position|repeat|blend-mode))?)$/i;
/** Anything that could escape the rule, load a resource, or run something. Gradient patterns need none of it. */
const UNSAFE_CSS_VALUE = /[{}<>@\\]|url\(|expression\(|javascript:/i;
const PLAIN_LENGTH = /^-?[\d.]+(px|em|rem|vmin|vmax|vw|vh)$/i;

/**
 * A pure-CSS pattern: the declarations of a rule such as css-pattern.com's `html { --s: 80px; ...
 * background: radial-gradient(...) ... }`, or the bare declarations. Only custom properties and
 * background properties are kept. The site's size variable (`--s`) is wired to Scale.
 */
function fromGradientCss(text: string): PatternParseResult {
  let body = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const open = body.indexOf("{");
  if (open >= 0) {
    const close = body.lastIndexOf("}");
    body = body.slice(open + 1, close > open ? close : undefined);
  }

  const declarations: string[] = [];
  for (const part of body.split(";")) {
    const colon = part.indexOf(":");
    if (colon < 0) continue;
    const name = part.slice(0, colon).trim();
    const value = part
      .slice(colon + 1)
      .replace(/\s+/g, " ")
      .trim();
    if (!value || !CSS_PATTERN_PROPERTY.test(name)) continue;
    if (UNSAFE_CSS_VALUE.test(value))
      return { ok: false, error: "That CSS uses something a background pattern can't." };
    if (name === "--s" && PLAIN_LENGTH.test(value)) {
      declarations.push(`--s:calc(${value} * var(--sv-pattern-scale, 100) / 100)`);
    } else {
      declarations.push(`${name}:${value}`);
    }
  }

  if (!declarations.some((d) => /^background/i.test(d) && /gradient\s*\(/i.test(d))) {
    return { ok: false, error: "Couldn't find a background in that CSS." };
  }
  return { ok: true, source: { url: "", kind: "css", css: declarations.join(";") } };
}

/** Characters that could close the injected rule or start another; fromGradientCss never produces them. */
const UNSAFE_PATTERN_CSS = /[{}<>@\\]|url\(/i;

/**
 * Applies a pure-CSS pattern: its declarations become one rule on the pattern layer, which outranks
 * the stylesheet's own rule through the doubled :root. Empty clears it. Runs from the app rather than
 * the theme boot script, which has no room for it.
 */
export function applyPatternCss(doc: Document, css: string): void {
  doc.getElementById("cove-pattern-css")?.remove();
  if (!css || UNSAFE_PATTERN_CSS.test(css)) return;
  const style = doc.createElement("style");
  style.id = "cove-pattern-css";
  style.textContent = `:root:root[data-component-style*="pattern"][data-style-pattern-sourcekind="css"] .cove-app-shell::before{${css}}`;
  doc.head.appendChild(style);
}

/** Whether a CSS pattern responds to Scale (its size variable was wired up when it was parsed). */
export function cssPatternIsScalable(css: string | undefined): boolean {
  return !!css && css.includes("--sv-pattern-scale");
}

/** The identity of a source in the saved list: its URL, or its CSS. */
export function patternKey(source: PatternSource): string {
  return source.kind === "css" ? `css:${source.css ?? ""}` : source.url;
}

/** A CSS pattern's declarations as a React style object, for previews. */
export function cssPatternStyle(css: string): Record<string, string> {
  const style: Record<string, string> = {};
  for (const part of css.split(";")) {
    const colon = part.indexOf(":");
    if (colon > 0) {
      const name = part.slice(0, colon);
      style[name.startsWith("--") ? name : name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = part.slice(
        colon + 1,
      );
    }
  }
  return style;
}

function decodeSvgDataUri(url: string): string | null {
  const comma = url.indexOf(",");
  if (comma < 0) return null;
  const header = url.slice(0, comma);
  const body = url.slice(comma + 1);
  try {
    return /;base64$/i.test(header) ? atob(body) : decodeURIComponent(body);
  } catch {
    return null;
  }
}

/** The tile width an SVG declares: its width attribute, else its viewBox width. */
export function svgWidth(markup: string): number | undefined {
  const tag = /<svg\b[^>]*>/i.exec(markup)?.[0];
  if (!tag) return undefined;
  const width = /\swidth\s*=\s*["']?\s*([\d.]+)(px)?\s*["'\s>/]/i.exec(tag);
  if (width) return positive(Number(width[1]));
  const viewBox = /\sviewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)/i.exec(tag);
  return viewBox ? positive(Number(viewBox[1])) : undefined;
}

function positive(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : undefined;
}

/** Reads the "My patterns" list stored as JSON in the pattern style options. */
export function readSavedPatterns(value: string | undefined): PatternSource[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PatternSource => {
      if (typeof entry !== "object" || entry === null) return false;
      const { url, kind, css } = entry as PatternSource;
      if (typeof url !== "string") return false;
      return kind === "svg" || kind === "image" || (kind === "css" && typeof css === "string" && css.length > 0);
    });
  } catch {
    return [];
  }
}

/** Loads an image to prove the link works and learn its natural size. */
export function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => reject(new Error("timeout")), 15000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("load failed"));
    };
    image.src = url;
  });
}

/**
 * Completes a theme's recommended Pattern options into what the Pattern style stores. Themes name a
 * built-in shape by `kind` alone ("hex") and this fills in its image and tile size; a custom source
 * is added to "My patterns" so it stays one click away after switching to something else, and a
 * photo without a declared width is measured so Scale has something to multiply.
 */
export async function resolveRecommendedPatternOptions(
  recommended: Record<string, string>,
  current: Record<string, string>,
): Promise<Record<string, string>> {
  const patch = { ...recommended };
  const builtIn = BUILT_IN_PATTERNS.find((pattern) => pattern.id === patch.kind);
  if (builtIn) {
    Object.assign(patch, { source: builtIn.url, sourcekind: "svg", sourcewidth: String(builtIn.width), css: "" });
  } else if (patch.kind === "custom" && patch.source) {
    const kind: PatternSourceKind = patch.sourcekind === "image" ? "image" : "svg";
    if (!patch.sourcewidth) {
      try {
        const { width } = await loadImageSize(patch.source);
        if (width > 0) patch.sourcewidth = String(width);
      } catch {
        // Unreachable right now: it still applies, and Scale works once the width is known.
      }
    }
    const width = Number(patch.sourcewidth) || undefined;
    const source: PatternSource = { url: patch.source, kind, ...(width ? { width } : {}) };
    patch.css = "";
    patch.library = JSON.stringify(rememberPattern(readSavedPatterns(current.library), source));
  }
  // Options the theme does not mention would otherwise keep values from the previous pattern.
  return { keepcolors: "off", dim: "0", ...patch };
}

/** Puts `source` first in the saved list, dropping an older copy and anything past the limit. */
export function rememberPattern(saved: PatternSource[], source: PatternSource): PatternSource[] {
  const key = patternKey(source);
  return [source, ...saved.filter((entry) => patternKey(entry) !== key)].slice(0, MAX_SAVED_PATTERNS);
}

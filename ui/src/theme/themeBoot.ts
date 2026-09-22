// How a resolved theme becomes DOM. ExtensionLoader imports this to cache the look it just painted;
// themeBoot.entry.ts is compiled into the inline script in index.html and imports it to replay that
// cache before the first paint. One owner of both directions is what keeps them from drifting.
//
// Because it ships inside that inline script: no runtime imports, no React, every export total, and
// small enough for the budget scripts/theme-boot.ts enforces.

import type { ExtensionThemeDef } from "../api/types";

export const THEME_BOOT_STORAGE_KEY = "cove-theme-boot";

// Bump when the shape changes. Older snapshots are ignored, never migrated.
export const THEME_BOOT_VERSION = 1;

// Inlined to keep this module import-free. Must match USER_KEY in ../auth/authStore.
const AUTH_USER_STORAGE_KEY = "cove_user";

// Marks the root attributes this module set, so they are only withdrawn while it still owns them.
const BOOT_OWNED_ATTRIBUTE = "data-cove-boot-theme";

/** Also mirrored by index.css's `@theme` block and index.html's inline style; themeBootContract.test.ts pins the three together. */
export const FALLBACK_DEFAULT_THEME: ExtensionThemeDef = {
  id: "default",
  name: "Default",
  description: "A clean, modern dark theme.",
  colorScheme: "dark",
  cssVariables: {
    "--color-background": "#16181d",
    "--color-nav": "#111317",
    "--color-card": "#1e2028",
    "--color-card-hover": "#252830",
    "--color-surface": "#1a1c23",
    "--color-border": "#2a2d38",
    "--color-input": "rgba(0, 0, 0, 0.25)",
    "--color-accent": "#4f8ff7",
    "--color-accent-hover": "#6ea4ff",
    "--color-foreground": "#e8eaf0",
    "--color-secondary": "#9ea3b0",
    "--color-muted": "#6b7085",
    "--color-overlay": "rgba(0, 0, 0, 0.55)",
    "--color-nav-active": "#4f8ff7",
  },
};

/** CSS custom properties driven by range-type style options, shared with ExtensionLoader's style effect. */
export const STYLE_OPTION_CSS_VARS: Record<string, Record<string, string>> = {
  gradient: { animated: "--sv-anim-speed", background: "--sv-bg-intensity", cards: "--sv-card-gradient" },
  glass: {
    cardblur: "--sv-card-blur",
    surfaceblur: "--sv-surface-blur",
    opacity: "--sv-surface-opacity",
    cardopacity: "--sv-card-opacity",
    buttonopacity: "--sv-button-opacity",
  },
  animated: { hover: "--sv-hover-glow" },
};

/** `("gradient", "cards")` -> `styleGradientCards`, the dataset key both passes write. */
export function styleOptionDatasetKey(styleId: string, optionKey: string): string {
  return `style${styleId.charAt(0).toUpperCase()}${styleId.slice(1)}${optionKey.charAt(0).toUpperCase()}${optionKey.slice(1)}`;
}

export interface ThemeBootSnapshot {
  /** Schema version. A snapshot whose `v` is not THEME_BOOT_VERSION is ignored. */
  v: number;
  /** The user this look belongs to, or null for anonymous and share-link sessions. */
  u: string | null;
  themeId: string;
  colorScheme: string | null;
  bgAnimation: string | null;
  vars: Record<string, string>;
  cssUrl: string | null;
  componentStyle: string;
  layoutStyle: string;
  styleOptions: Record<string, Record<string, string>>;
}

// A snapshot outlives the extension that produced it and is replayed straight into a <style>, so it
// is validated on the way in as well as on the way out.
const MAX_VARS = 64;
const MAX_VALUE_LENGTH = 120;
const CSS_VAR_NAME = /^--[A-Za-z0-9_-]+$/;
// Anything that could close the rule or the <style>, or start a new declaration or at-rule. A comment
// opener counts: an unterminated /* swallows the rest of the block including the canvas rule. Bare
// slashes stay legal because modern colour syntax uses them, as in rgb(0 0 0 / 50%).
const UNSAFE_CSS_VALUE = /[{}<>;@\\]|\/\*|\*\//;
// Spaces allowed: component and layout styles are space-separated sets. Dots and colons because
// theme ids are author-chosen and extensions namespace them, as in com.acme.dark.
const SAFE_NAME = /^[A-Za-z0-9 ._:@+-]{1,64}$/;
// Style ids and option keys become dataset keys, and DOMStringMap throws on anything that is not a
// valid JS property name, so they are held to a stricter set than the names above.
const SAFE_DATASET_PART = /^[A-Za-z0-9_]{1,64}$/;
const SAFE_OPTION_VALUE = /^[A-Za-z0-9 ._%-]{1,64}$/;
// Same-origin absolute path only, so neither "//host" nor "https://host".
const SAME_ORIGIN_PATH = /^\/[^/\\]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeName(value: unknown): string | null {
  return typeof value === "string" && SAFE_NAME.test(value) ? value : null;
}

function safeCssVars(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > MAX_VARS) return null;
  const vars: Record<string, string> = {};
  for (const [name, raw] of entries) {
    if (!CSS_VAR_NAME.test(name)) return null;
    if (typeof raw !== "string" || raw.length > MAX_VALUE_LENGTH || UNSAFE_CSS_VALUE.test(raw)) return null;
    vars[name] = raw;
  }
  return vars;
}

function safeStyleOptions(value: unknown): Record<string, Record<string, string>> | null {
  if (!isRecord(value)) return null;
  const options: Record<string, Record<string, string>> = Object.create(null) as Record<string, Record<string, string>>;
  for (const [styleId, raw] of Object.entries(value)) {
    if (!SAFE_DATASET_PART.test(styleId) || !isRecord(raw)) return null;
    const parsed: Record<string, string> = Object.create(null) as Record<string, string>;
    for (const [key, optionValue] of Object.entries(raw)) {
      if (!SAFE_DATASET_PART.test(key)) return null;
      if (typeof optionValue !== "string" || !SAFE_OPTION_VALUE.test(optionValue)) return null;
      parsed[key] = optionValue;
    }
    options[styleId] = parsed;
  }
  return options;
}

/** Any bad field rejects the whole snapshot: a partly applied theme is a worse flash than none. */
export function sanitizeThemeBootSnapshot(value: unknown): ThemeBootSnapshot | null {
  if (!isRecord(value) || value.v !== THEME_BOOT_VERSION) return null;

  const themeId = safeName(value.themeId);
  if (!themeId) return null;

  const vars = safeCssVars(value.vars ?? {});
  if (!vars) return null;

  const styleOptions = safeStyleOptions(value.styleOptions ?? {});
  if (!styleOptions) return null;

  const componentStyle = safeName(value.componentStyle ?? "default");
  const layoutStyle = safeName(value.layoutStyle ?? "default");
  if (!componentStyle || !layoutStyle) return null;

  if (value.u !== null && typeof value.u !== "string") return null;
  if (value.colorScheme != null && !safeName(value.colorScheme)) return null;
  if (value.bgAnimation != null && !safeName(value.bgAnimation)) return null;
  if (value.cssUrl != null && (typeof value.cssUrl !== "string" || !SAME_ORIGIN_PATH.test(value.cssUrl))) return null;

  return {
    v: THEME_BOOT_VERSION,
    u: (value.u as string | null) ?? null,
    themeId,
    colorScheme: (value.colorScheme as string | null) ?? null,
    bgAnimation: (value.bgAnimation as string | null) ?? null,
    vars,
    cssUrl: (value.cssUrl as string | null) ?? null,
    componentStyle,
    layoutStyle,
    styleOptions,
  };
}

export function readThemeBootSnapshot(): ThemeBootSnapshot | null {
  try {
    const raw = localStorage.getItem(THEME_BOOT_STORAGE_KEY);
    return raw ? sanitizeThemeBootSnapshot(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeThemeBootSnapshot(snapshot: ThemeBootSnapshot): void {
  try {
    const sanitized = sanitizeThemeBootSnapshot(snapshot);
    if (!sanitized) {
      clearThemeBootSnapshot();
      return;
    }
    localStorage.setItem(THEME_BOOT_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    /* storage disabled or full: the app still paints, it just cannot pre-paint next time */
  }
}

export function clearThemeBootSnapshot(): void {
  try {
    localStorage.removeItem(THEME_BOOT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** The id of the signed-in user as the auth store cached it, or null when there is none. */
export function readCachedUserId(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    const user: unknown = JSON.parse(raw);
    return isRecord(user) && typeof user.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

/**
 * Mirrors ExtensionLoader's theme, component style, style option and layout effects. The elements
 * reuse its ids on purpose: its theme effect removes them by id before applying, so it takes
 * ownership with no extra code.
 */
export function applyThemeBootSnapshot(doc: Document, snapshot: ThemeBootSnapshot): void {
  const root = doc.documentElement;

  // Colours before attributes. The dataset writes below can still throw on a hostile snapshot, and
  // getting the palette in first means such a snapshot degrades to a plain theme rather than to
  // attributes with no colours behind them, which paints worse than not booting at all.
  applyCanvas(doc, snapshot);

  // Marks the attributes below as this module's, so the handover only withdraws its own work.
  root.setAttribute(BOOT_OWNED_ATTRIBUTE, "1");
  root.setAttribute("data-theme", snapshot.themeId);
  if (snapshot.colorScheme === "light") root.setAttribute("data-color-scheme", "light");
  else root.removeAttribute("data-color-scheme");
  if (snapshot.bgAnimation) root.setAttribute("data-theme-bg-animation", snapshot.bgAnimation);
  else root.removeAttribute("data-theme-bg-animation");
  root.setAttribute("data-component-style", snapshot.componentStyle);
  root.setAttribute("data-layout", snapshot.layoutStyle);

  for (const [styleId, options] of Object.entries(snapshot.styleOptions)) {
    for (const [key, value] of Object.entries(options)) {
      root.dataset[styleOptionDatasetKey(styleId, key)] = value;
      const cssVar = STYLE_OPTION_CSS_VARS[styleId]?.[key];
      if (cssVar) root.style.setProperty(cssVar, value);
    }
  }
}

function applyCanvas(doc: Document, snapshot: ThemeBootSnapshot): void {
  const declarations = Object.entries(snapshot.vars).map(([name, value]) => `  ${name}: ${value};`);
  // Colours `html` directly as well as through the variables, so the literal fallback in index.html
  // is replaced before index.css exists. --color-background is what the app's full-height container
  // paints, i.e. what actually fills the viewport -- `body`'s own colour is never visible.
  const background = snapshot.vars["--color-background"];
  const foreground = snapshot.vars["--color-foreground"];
  // `html body` outweighs index.css's own `body` rule, which paints the shell palette: a different
  // colour that would otherwise show through from when the stylesheet lands until React renders its
  // container. ExtensionLoader's override drops this rule again, by which point that container covers it.
  const canvas =
    background || foreground
      ? `\nhtml,\nhtml body {\n${background ? `  background-color: ${background};\n` : ""}${foreground ? `  color: ${foreground};\n` : ""}}`
      : "";

  if (declarations.length > 0 || canvas) {
    const style = doc.createElement("style");
    style.id = "cove-theme-override";
    style.setAttribute("data-cove-boot", "1");
    style.textContent = `:root {\n${declarations.join("\n")}\n}${canvas}`;
    doc.head.appendChild(style);
  }

  if (snapshot.cssUrl) {
    const link = doc.createElement("link");
    link.id = "cove-theme-css";
    link.setAttribute("data-cove-boot", "1");
    link.rel = "stylesheet";
    link.href = snapshot.cssUrl;
    doc.head.appendChild(link);
  }
}

/**
 * Removes only what this module created. Elements ExtensionLoader installed carry no marker, and the
 * root attributes are withdrawn only while this module still owns them -- once the theme effect has
 * taken over, stripping them would leave every themed selector in index.css unmatched with nothing
 * left to run and put them back.
 */
export function clearThemeBootArtifacts(doc: Document): void {
  try {
    for (const element of Array.from(doc.querySelectorAll("[data-cove-boot]"))) element.remove();
    const root = doc.documentElement;
    if (!root.hasAttribute(BOOT_OWNED_ATTRIBUTE)) return;
    root.removeAttribute(BOOT_OWNED_ATTRIBUTE);
    root.removeAttribute("data-theme");
    root.removeAttribute("data-color-scheme");
    root.removeAttribute("data-theme-bg-animation");
    for (const key of Object.keys(root.dataset)) if (key.startsWith("style")) delete root.dataset[key];
    for (const map of Object.values(STYLE_OPTION_CSS_VARS)) {
      for (const cssVar of Object.values(map)) root.style.removeProperty(cssVar);
    }
  } catch {
    /* ignore */
  }
}

/** Whether the boot script painted a look, i.e. whether the theme is already known to this page. */
export function hasBootedLook(doc: Document = document): boolean {
  try {
    return doc.documentElement.hasAttribute(BOOT_OWNED_ATTRIBUTE);
  } catch {
    return false;
  }
}

/** Entry point of the inline boot script. Never throws. */
export function bootTheme(): void {
  try {
    const snapshot = readThemeBootSnapshot();
    // A snapshot belongs to the user it was captured for; a shared browser must not replay it.
    if (!snapshot || snapshot.u !== readCachedUserId()) return;
    applyThemeBootSnapshot(document, snapshot);
  } catch {
    /* index.html's literal fallback is what the user sees */
  }
}

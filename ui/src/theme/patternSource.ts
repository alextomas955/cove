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
  // Filled shapes from Hero Patterns by Steve Schoger (heropatterns.com, CC BY 4.0), recoloured to black.
  {
    id: "mosaic",
    label: "Mosaic",
    width: 48,
    height: 48,
    body: "<path d='M12 0h18v6h6v6h6v18h-6v6h-6v6H12v-6H6v-6H0V12h6V6h6V0zm12 6h-6v6h-6v6H6v6h6v6h6v6h6v-6h6v-6h6v-6h-6v-6h-6V6zm-6 12h6v6h-6v-6zm24 24h6v6h-6v-6z'/>",
  },
  {
    id: "circuit",
    label: "Circuit",
    width: 52,
    height: 52,
    body: "<path d='M0 17.83V0h17.83a3 3 0 0 1-5.66 2H5.9A5 5 0 0 1 2 5.9v6.27a3 3 0 0 1-2 5.66zm0 18.34a3 3 0 0 1 2 5.66v6.27A5 5 0 0 1 5.9 52h6.27a3 3 0 0 1 5.66 0H0V36.17zM36.17 52a3 3 0 0 1 5.66 0h6.27a5 5 0 0 1 3.9-3.9v-6.27a3 3 0 0 1 0-5.66V52H36.17zM0 31.93v-9.78a5 5 0 0 1 3.8.72l4.43-4.43a3 3 0 1 1 1.42 1.41L5.2 24.28a5 5 0 0 1 0 5.52l4.44 4.43a3 3 0 1 1-1.42 1.42L3.8 31.2a5 5 0 0 1-3.8.72zm52-14.1a3 3 0 0 1 0-5.66V5.9A5 5 0 0 1 48.1 2h-6.27a3 3 0 0 1-5.66-2H52v17.83zm0 14.1a4.97 4.97 0 0 1-1.72-.72l-4.43 4.44a3 3 0 1 1-1.41-1.42l4.43-4.43a5 5 0 0 1 0-5.52l-4.43-4.43a3 3 0 1 1 1.41-1.41l4.43 4.43c.53-.35 1.12-.6 1.72-.72v9.78zM22.15 0h9.78a5 5 0 0 1-.72 3.8l4.44 4.43a3 3 0 1 1-1.42 1.42L29.8 5.2a5 5 0 0 1-5.52 0l-4.43 4.44a3 3 0 1 1-1.41-1.42l4.43-4.43a5 5 0 0 1-.72-3.8zm0 52c.13-.6.37-1.19.72-1.72l-4.43-4.43a3 3 0 1 1 1.41-1.41l4.43 4.43a5 5 0 0 1 5.52 0l4.43-4.43a3 3 0 1 1 1.42 1.41l-4.44 4.43c.36.53.6 1.12.72 1.72h-9.78zm9.75-24a5 5 0 0 1-3.9 3.9v6.27a3 3 0 1 1-2 0V31.9a5 5 0 0 1-3.9-3.9h-6.27a3 3 0 1 1 0-2h6.27a5 5 0 0 1 3.9-3.9v-6.27a3 3 0 1 1 2 0v6.27a5 5 0 0 1 3.9 3.9h6.27a3 3 0 1 1 0 2H31.9z'/>",
  },
  {
    id: "leaves",
    label: "Leaves",
    width: 88,
    height: 24,
    body: "<g fill-rule='evenodd'><path d='M10 0l30 15 2 1V2.18A10 10 0 0 0 41.76 0H39.7a8 8 0 0 1 .3 2.18v10.58L14.47 0H10zm31.76 24a10 10 0 0 0-5.29-6.76L4 1 2 0v13.82a10 10 0 0 0 5.53 8.94L10 24h4.47l-6.05-3.02A8 8 0 0 1 4 13.82V3.24l31.58 15.78A8 8 0 0 1 39.7 24h2.06zM78 24l2.47-1.24A10 10 0 0 0 86 13.82V0l-2 1-32.47 16.24A10 10 0 0 0 46.24 24h2.06a8 8 0 0 1 4.12-4.98L84 3.24v10.58a8 8 0 0 1-4.42 7.16L73.53 24H78zm0-24L48 15l-2 1V2.18A10 10 0 0 1 46.24 0h2.06a8 8 0 0 0-.3 2.18v10.58L73.53 0H78z'/></g>",
  },
  {
    id: "rosettes",
    label: "Rosettes",
    width: 80,
    height: 80,
    body: "<g fill-rule='evenodd'><path d='M77.17 0H80v2.83l-.1.1A39.9 39.9 0 0 1 74.64 20a39.9 39.9 0 0 1 5.24 17.06l.11.11v2.89c-.01 6.9-1.8 13.79-5.35 19.94A39.96 39.96 0 0 1 80 79.94V80h-2.83L66.84 69.66a39.83 39.83 0 0 1-24.1 10.25l.09.09h-5.66l.1-.1c-8.7-.58-17.22-4-24.1-10.23L2.82 80H0V79.94c.01-6.9 1.8-13.8 5.35-19.94A39.96 39.96 0 0 1 0 40.06V37.17l.1-.1A39.9 39.9 0 0 1 5.36 20 39.9 39.9 0 0 1 .1 2.94L0 2.83V0h2.83l-.1.1a39.83 39.83 0 0 1 24.1 10.24L37.18 0H40c0 6.92-1.78 13.83-5.35 20A39.96 39.96 0 0 1 40 40c0-6.92 1.78-13.83 5.35-20A39.96 39.96 0 0 1 40 0h2.83l10.33 10.34A39.83 39.83 0 0 1 77.26.09L77.17 0zm.77 77.94c-.3-5.52-1.8-11-4.49-16a40.18 40.18 0 0 1-5.17 6.34l9.66 9.66zm-12.52-9.7l-6.83-6.83-5.46 5.46-1.41 1.41-9.66 9.66c8.4-.45 16.69-3.68 23.36-9.7zm-23.07 6.58l7.99-7.98a40.05 40.05 0 0 1-3.79-4.9 37.88 37.88 0 0 0-4.2 12.88zM47.68 60a37.98 37.98 0 0 0 4.07 5.42L57.17 60l-5.42-5.42A38 38 0 0 0 47.68 60zm2.66-6.84a40.06 40.06 0 0 0-3.79 4.9 37.88 37.88 0 0 1-4.2-12.88l7.99 7.98zm1.38-1.44l1.41 1.41 5.46 5.46 6.83-6.84a37.85 37.85 0 0 0-23.36-9.7l9.66 9.67zM60 60l6.87 6.87A38.1 38.1 0 0 0 72.32 60a38.11 38.11 0 0 0-5.45-6.87L60 60zm-14.65 0a39.9 39.9 0 0 0-5.24 17.06l-.11.11-.1-.1A39.9 39.9 0 0 0 34.64 60a39.9 39.9 0 0 0 5.24-17.06l.11-.11.1.1A39.9 39.9 0 0 0 45.36 60zm9.23-48.25a37.85 37.85 0 0 1 23.36-9.7l-9.66 9.67-1.41 1.41-5.46 5.46-6.83-6.84zm13.67 13.67L62.83 20l5.42-5.42A38 38 0 0 1 72.32 20a37.98 37.98 0 0 1-4.07 5.42zm5.2-3.47a40.05 40.05 0 0 1-3.79 4.89l7.99 7.98c-.61-4.45-2.01-8.82-4.2-12.87zm-6.58 4.92l1.41 1.41 9.66 9.66a37.85 37.85 0 0 1-23.36-9.7l6.83-6.83 5.46 5.46zM53.13 13.13L60 20l-6.87 6.87A38.11 38.11 0 0 1 47.68 20a38.1 38.1 0 0 1 5.45-6.87zm-1.41-1.41l-9.66-9.66c.3 5.52 1.8 11 4.49 16a40.18 40.18 0 0 1 5.17-6.34zm-9.66 26.22c.3-5.52 1.8-11 4.49-16a40.18 40.18 0 0 0 5.17 6.34l-9.66 9.66zm26.22 13.78l9.66-9.66c-.3 5.52-1.8 11-4.49 16a40.18 40.18 0 0 0-5.17-6.34zm8.98-11.81L66.84 50.34a39.83 39.83 0 0 0-24.1-10.25l10.42-10.43a39.83 39.83 0 0 0 24.1 10.25zm-7.6-26.75a40.06 40.06 0 0 1 3.79 4.9 37.88 37.88 0 0 0 4.2-12.88l-7.99 7.98zm-31.72 28.9c-8.4.45-16.69 3.68-23.36 9.7l6.83 6.83 5.46-5.46 1.41-1.41 9.66-9.66zM22.83 60l5.42 5.42c1.54-1.7 2.9-3.52 4.07-5.42a38 38 0 0 0-4.07-5.42L22.83 60zm5.45 8.28l-1.41-1.41-5.46-5.46-6.83 6.84a37.85 37.85 0 0 0 23.36 9.7l-9.66-9.67zm9.37 6.54l-7.99-7.98a40.05 40.05 0 0 0 3.79-4.9 37.88 37.88 0 0 1 4.2 12.88zM20 60l-6.87-6.87A38.11 38.11 0 0 0 7.68 60a38.11 38.11 0 0 0 5.45 6.87L20 60zm17.26-19.9L26.84 29.65a39.83 39.83 0 0 1-24.1 10.25l10.42 10.43a39.83 39.83 0 0 1 24.1-10.25zm-35.2 1.96l9.66 9.66a40.18 40.18 0 0 0-5.17 6.33c-2.7-5-4.2-10.47-4.5-16zm4.49 19.89c-2.7 5-4.2 10.47-4.5 16l9.67-9.67a40.18 40.18 0 0 1-5.17-6.33zm31.1-16.77c-.61 4.45-2.01 8.82-4.2 12.87a40.06 40.06 0 0 0-3.79-4.89l7.99-7.98zm-4.2-23.23c2.7 5 4.2 10.47 4.5 16l-9.67-9.67c1.97-1.97 3.7-4.1 5.17-6.33zm-14.86-.54l6.83 6.84a37.85 37.85 0 0 1-23.36 9.7l9.66-9.67 1.41-1.41 5.46-5.46zm-8.25 5.43l-7.99 7.98c.61-4.45 2.01-8.82 4.2-12.87a40.04 40.04 0 0 0 3.79 4.89zm1.41-1.42A37.99 37.99 0 0 1 7.68 20a38 38 0 0 1 4.07-5.42L17.17 20l-5.42 5.42zm-5.2-7.37a40.04 40.04 0 0 1 3.79-4.89L2.35 5.18c.61 4.45 2.01 8.82 4.2 12.87zm6.58-4.92l-1.41-1.41-9.66-9.66a37.85 37.85 0 0 1 23.36 9.7l-6.83 6.83-5.46-5.46zm13.74 13.74L20 20l6.87-6.87A38.1 38.1 0 0 1 32.32 20a38.1 38.1 0 0 1-5.45 6.87zm6.58-8.82a40.18 40.18 0 0 0-5.17-6.33l9.66-9.66c-.3 5.52-1.8 11-4.49 16z'/></g>",
  },
  {
    id: "dashes",
    label: "Dashes",
    width: 16,
    height: 32,
    body: "<path fill-rule='evenodd' d='M0 24h4v2H0v-2zm0 4h6v2H0v-2zm0-8h2v2H0v-2zM0 0h4v2H0V0zm0 4h2v2H0V4zm16 20h-6v2h6v-2zm0 4H8v2h8v-2zm0-8h-4v2h4v-2zm0-20h-6v2h6V0zm0 4h-4v2h4V4zm-2 12h2v2h-2v-2zm0-8h2v2h-2V8zM2 8h10v2H2V8zm0 8h10v2H2v-2zm-2-4h14v2H0v-2zm4-8h6v2H4V4zm0 16h6v2H4v-2zM6 0h2v2H6V0zm0 24h2v2H6v-2z'/>",
  },
  {
    id: "arabesque",
    label: "Arabesque",
    width: 80,
    height: 88,
    body: "<path d='M22 21.91V26h-2c-9.94 0-18 8.06-18 18 0 9.943 8.058 18 18 18h2v4.09c8.012.722 14.785 5.738 18 12.73 3.212-6.99 9.983-12.008 18-12.73V62h2c9.94 0 18-8.06 18-18 0-9.943-8.058-18-18-18h-2v-4.09c-8.012-.722-14.785-5.738-18-12.73-3.212 6.99-9.983 12.008-18 12.73zM54 58v4.696c-5.574 1.316-10.455 4.428-14 8.69-3.545-4.262-8.426-7.374-14-8.69V58h-5.993C12.27 58 6 51.734 6 44c0-7.732 6.275-14 14.007-14H26v-4.696c5.574-1.316 10.455-4.428 14-8.69 3.545 4.262 8.426 7.374 14 8.69V30h5.993C67.73 30 74 36.266 74 44c0 7.732-6.275 14-14.007 14H54zM42 88c0-9.94 8.06-18 18-18h2v-4.09c8.016-.722 14.787-5.738 18-12.73v7.434c-3.545 4.262-8.426 7.374-14 8.69V74h-5.993C52.275 74 46 80.268 46 88h-4zm-4 0c0-9.943-8.058-18-18-18h-2v-4.09c-8.012-.722-14.785-5.738-18-12.73v7.434c3.545 4.262 8.426 7.374 14 8.69V74h5.993C27.73 74 34 80.266 34 88h4zm4-88c0 9.943 8.058 18 18 18h2v4.09c8.012.722 14.785 5.738 18 12.73v-7.434c-3.545-4.262-8.426-7.374-14-8.69V14h-5.993C52.27 14 46 7.734 46 0h-4zM0 34.82c3.213-6.992 9.984-12.008 18-12.73V18h2c9.94 0 18-8.06 18-18h-4c0 7.732-6.275 14-14.007 14H14v4.696c-5.574 1.316-10.455 4.428-14 8.69v7.433z' fill-rule='evenodd'/>",
  },
  {
    id: "ziggurat",
    label: "Ziggurat",
    width: 60,
    height: 60,
    body: "<path d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zm20.97 0l9.315 9.314-1.414 1.414L34.828 0h2.83zM22.344 0L13.03 9.314l1.414 1.414L25.172 0h-2.83zM32 0l12.142 12.142-1.414 1.414L30 .828 17.272 13.556l-1.414-1.414L28 0h4zM.284 0l28 28-1.414 1.414L0 2.544V0h.284zM0 5.373l25.456 25.455-1.414 1.415L0 8.2V5.374zm0 5.656l22.627 22.627-1.414 1.414L0 13.86v-2.83zm0 5.656l19.8 19.8-1.415 1.413L0 19.514v-2.83zm0 5.657l16.97 16.97-1.414 1.415L0 25.172v-2.83zM0 28l14.142 14.142-1.414 1.414L0 30.828V28zm0 5.657L11.314 44.97 9.9 46.386l-9.9-9.9v-2.828zm0 5.657L8.485 47.8 7.07 49.212 0 42.143v-2.83zm0 5.657l5.657 5.657-1.414 1.415L0 47.8v-2.83zm0 5.657l2.828 2.83-1.414 1.413L0 53.456v-2.83zM54.627 60L30 35.373 5.373 60H8.2L30 38.2 51.8 60h2.827zm-5.656 0L30 41.03 11.03 60h2.828L30 43.858 46.142 60h2.83zm-5.656 0L30 46.686 16.686 60h2.83L30 49.515 40.485 60h2.83zm-5.657 0L30 52.343 22.343 60h2.83L30 55.172 34.828 60h2.83zM32 60l-2-2-2 2h4zM59.716 0l-28 28 1.414 1.414L60 2.544V0h-.284zM60 5.373L34.544 30.828l1.414 1.415L60 8.2V5.374zm0 5.656L37.373 33.656l1.414 1.414L60 13.86v-2.83zm0 5.656l-19.8 19.8 1.415 1.413L60 19.514v-2.83zm0 5.657l-16.97 16.97 1.414 1.415L60 25.172v-2.83zM60 28L45.858 42.142l1.414 1.414L60 30.828V28zm0 5.657L48.686 44.97l1.415 1.415 9.9-9.9v-2.828zm0 5.657L51.515 47.8l1.414 1.413 7.07-7.07v-2.83zm0 5.657l-5.657 5.657 1.414 1.415L60 47.8v-2.83zm0 5.657l-2.828 2.83 1.414 1.413L60 53.456v-2.83zM39.9 16.385l1.414-1.414L30 3.658 18.686 14.97l1.415 1.415 9.9-9.9 9.9 9.9zm-2.83 2.828l1.415-1.414L30 9.313 21.515 17.8l1.414 1.413 7.07-7.07 7.07 7.07zm-2.827 2.83l1.414-1.416L30 14.97l-5.657 5.657 1.414 1.415L30 17.8l4.243 4.242zm-2.83 2.827l1.415-1.414L30 20.626l-2.828 2.83 1.414 1.414L30 23.456l1.414 1.414zM56.87 59.414L58.284 58 30 29.716 1.716 58l1.414 1.414L30 32.544l26.87 26.87z' fill-rule='evenodd'/>",
  },
  {
    id: "scallops",
    label: "Scallops",
    width: 56,
    height: 28,
    body: "<path d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30zM7.75 28H0v-2c2.81 0 5.46.73 7.75 2zM56 20v2c-5.6 0-10.65 2.3-14.28 6h-2.7c4.04-4.89 10.15-8 16.98-8zm-39.03 8h-2.69C10.65 24.3 5.6 22 0 22v-2c6.83 0 12.94 3.11 16.97 8zm15.01-.4a28.09 28.09 0 0 1 2.8-3.86 8 8 0 0 0-13.55 0c1.03 1.2 1.97 2.5 2.79 3.86a4 4 0 0 1 7.96 0zm14.29-11.86c1.3-.48 2.63-.87 4-1.15a25.99 25.99 0 0 0-44.55 0c1.38.28 2.72.67 4.01 1.15a21.98 21.98 0 0 1 36.54 0zm-5.43 2.71c1.13-.72 2.3-1.37 3.54-1.93a19.98 19.98 0 0 0-32.76 0c1.23.56 2.41 1.2 3.54 1.93a15.98 15.98 0 0 1 25.68 0zm-4.67 3.78c.94-.95 1.96-1.83 3.03-2.63a13.98 13.98 0 0 0-22.4 0c1.07.8 2.09 1.68 3.03 2.63a9.99 9.99 0 0 1 16.34 0z'/>",
  },
  {
    id: "lattice",
    label: "Lattice",
    width: 48,
    height: 64,
    body: "<path d='M48 28v-4L36 12 24 24 12 12 0 24v4l4 4-4 4v4l12 12 12-12 12 12 12-12v-4l-4-4 4-4zM8 32l-6-6 10-10 10 10-6 6 6 6-10 10L2 38l6-6zm12 0l4-4 4 4-4 4-4-4zm12 0l-6-6 10-10 10 10-6 6 6 6-10 10-10-10 6-6zM0 16L10 6 4 0h4l4 4 4-4h4l-6 6 10 10L34 6l-6-6h4l4 4 4-4h4l-6 6 10 10v4L36 8 24 20 12 8 0 20v-4zm0 32l10 10-6 6h4l4-4 4 4h4l-6-6 10-10 10 10-6 6h4l4-4 4 4h4l-6-6 10-10v-4L36 56 24 44 12 56 0 44v4z' fill-rule='evenodd'/>",
  },
];

export type BuiltInPattern = {
  id: string;
  label: string;
  /** Options choosing it sets, for textures that only look right one way. */
  defaults?: Record<string, string>;
  /** Where it used to load from; saved copies of these are the same pattern. */
  formerUrls?: string[];
} & PatternSource;

/** Built-in textures painted in their own colours rather than used as masks. */
const BUILT_IN_IMAGE_PATTERNS: BuiltInPattern[] = [
  {
    id: "argyle",
    label: "Argyle",
    kind: "image",
    url: "/patterns/argyle.png",
    width: 106,
    formerUrls: ["https://transparenttextures.com/patterns/argyle.png"],
    defaults: { fit: "tile", opacity: "50", scale: "100", dim: "25" },
  },
];

export const BUILT_IN_PATTERNS: BuiltInPattern[] = [
  ...BUILT_IN_PATTERN_MARKUP.map(({ id, label, width, height, body }): BuiltInPattern => ({
    id,
    label,
    kind: "svg",
    width,
    url: `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${body}</svg>`,
    )}`,
  })),
  ...BUILT_IN_IMAGE_PATTERNS,
];

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
 * built-in pattern by `kind` alone ("hex", "argyle") and this fills in its image and tile size; a custom source
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
    Object.assign(patch, {
      source: builtIn.url,
      sourcekind: builtIn.kind,
      sourcewidth: builtIn.width ? String(builtIn.width) : "",
      css: "",
    });
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

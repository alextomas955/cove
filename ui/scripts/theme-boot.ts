import path from "node:path";
import { build } from "vite";
import type { OutputChunk, RollupOutput } from "rollup";

export const themeBootEntry = path.resolve(import.meta.dirname, "../src/theme/themeBoot.entry.ts");

// The script is parser-blocking and inlined into every HTML response. The budget is what catches
// someone importing half of ExtensionLoader into themeBoot.ts.
export const themeBootMaxBytes = 4096;

let cached: Promise<string> | null = null;

/**
 * Bundle `themeBoot.entry.ts` into a self-contained classic script.
 *
 * A nested build rather than a transform: the output must be one import-free IIFE, and under
 * rolldown-based Vite `transformWithEsbuild` is unavailable and `transformWithOxc` cannot bundle.
 * Bundling is what lets themeBoot.ts stay a normal module ExtensionLoader can import.
 */
export function compileThemeBootScript(): Promise<string> {
  // Caches the promise, not the result: two concurrent transformIndexHtml calls would otherwise each
  // start their own nested build.
  cached ??= compile();
  return cached;
}

async function compile(): Promise<string> {
  const result = await build({
    // Both load-bearing: otherwise the nested build reads this vite.config.ts and recurses.
    configFile: false,
    plugins: [],
    logLevel: "silent",
    build: {
      write: false,
      minify: true,
      target: "es2018",
      lib: {
        entry: themeBootEntry,
        formats: ["iife"],
        name: "__coveThemeBoot",
        fileName: () => "theme-boot.js",
      },
    },
  });

  const outputs = (Array.isArray(result) ? result : [result]) as RollupOutput[];
  const chunk = outputs[0]?.output?.find((item): item is OutputChunk => item.type === "chunk");
  if (!chunk) throw new Error("theme boot script produced no chunk");

  const code = chunk.code.trim();
  const size = Buffer.byteLength(code, "utf8");
  if (size > themeBootMaxBytes) {
    throw new Error(`theme boot script is ${size} bytes, over the ${themeBootMaxBytes} byte budget`);
  }

  return code;
}

/** Drop the cached bundle so the dev server recompiles after an edit under src/theme/. */
export function invalidateThemeBootScript(): void {
  cached = null;
}

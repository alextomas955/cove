// Inlines the generated host-key constant values into the SDK's own runtime output.
//
// `dist/index.js` re-exports the host-key constants (EntityKinds, EventKinds, …) as runtime values.
// Those values originate in the `@cove/types` workspace package, which ships TypeScript sources only
// and has no runtime entry point — so a bare runtime import of it is unresolvable for anyone
// consuming the published SDK standalone. This step resolves `@cove/types` at build time and rewrites
// `dist/contracts.js` as a self-contained module holding the constant values directly, so the
// published bundle carries them with no runtime dependency on `@cove/types`. Only the constants have
// a runtime counterpart; the rest of `@cove/types` is types-only and erases during bundling.
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

await build({
  entryPoints: [path.join(projectRoot, "src/contracts.ts")],
  outfile: path.join(projectRoot, "dist/contracts.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  // Resolve the types-only workspace package to its source so its runtime values inline here rather
  // than surviving as an unresolvable bare import.
  alias: { "@cove/types": path.resolve(projectRoot, "../types/index.ts") },
  logLevel: "warning",
});

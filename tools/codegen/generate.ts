// Generates the @cove/types surface from the committed OpenAPI document.
//
// Reads ONLY the checked-in contracts/cove.openapi.json and writes the single
// generated module sdk/types/openapi.ts. The hand-maintained barrel (index.ts)
// and the package manifest are never touched. Paths are resolved from this
// script's location so the current working directory does not matter.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(__dirname, "../../contracts/cove.openapi.json");
const outPath = path.resolve(__dirname, "../../sdk/types/openapi.ts");

// Verbatim generated-file banner used across the repo's generated sources.
const BANNER = "// AUTO-GENERATED FILE. DO NOT EDIT.";

async function main() {
  const ast = await openapiTS(pathToFileURL(specPath), {
    // Stable ordering so a re-run diffs only on real contract changes.
    alphabetize: true,
    // Emit top-level aliases (e.g. `Video`) whose names match the hand types...
    rootTypes: true,
    // ...without a schema prefix, so `Video` is `Video`, not `SchemaVideo`.
    rootTypesNoSchemaPrefix: true,
    // Keep enums as string unions rather than TypeScript `enum` values.
    enum: false,
    // Let the schema's `required` array decide which members are optional. Without this, a member
    // that documents a server-side default is emitted as always-present, which would force callers
    // to supply values the API fills in.
    defaultNonNullable: false,
  });

  const output = `${BANNER}\n${astToString(ast)}`;
  writeFileSync(outPath, output, "utf8");
  console.log(
    `Generated ${path.relative(process.cwd(), outPath)} from ${path.relative(process.cwd(), specPath)}`,
  );
}

main().catch((error) => {
  console.error("Failed to generate @cove/types from the OpenAPI document", error);
  process.exit(1);
});

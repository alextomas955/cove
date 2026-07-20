// Generates the @cove/types surface from the committed contract documents.
//
// Reads ONLY the checked-in contracts/cove.openapi.json and contracts/cove.contracts.json and
// writes the generated modules sdk/types/openapi.ts and sdk/types/contracts.g.ts. The
// hand-maintained barrel (index.ts) and the package manifest are never touched. Paths are resolved
// from this script's location so the current working directory does not matter.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(__dirname, "../../contracts/cove.openapi.json");
const outPath = path.resolve(__dirname, "../../sdk/types/openapi.ts");
const contractsPath = path.resolve(__dirname, "../../contracts/cove.contracts.json");
const contractsOutPath = path.resolve(__dirname, "../../sdk/types/contracts.g.ts");

// Verbatim generated-file banner used across the repo's generated sources.
const BANNER = "// AUTO-GENERATED FILE. DO NOT EDIT.";

// Renders sdk/types/contracts.g.ts from the committed contract document. Every family becomes a
// frozen const object of key -> pinned wire token plus a value-union alias, so C# and TS share one
// definition of every host-defined key. Output is fully alphabetized (families and their members)
// to match the sorted source document and keep re-runs byte-identical.
function renderContracts(source: string): string {
  const families = JSON.parse(source) as Record<string, Record<string, string>>;
  const blocks = Object.keys(families)
    .sort()
    .map((family) => {
      const members = families[family];
      const entries = Object.keys(members)
        .sort()
        .map((key) => `  ${key}: ${JSON.stringify(members[key])},`)
        .join("\n");
      // Families are named as plurals (EntityKinds, UiSlotKeys); the value-union alias is singular.
      const alias = family.replace(/s$/, "");
      return [
        `export const ${family} = {`,
        entries,
        `} as const;`,
        ``,
        `export type ${alias} = (typeof ${family})[keyof typeof ${family}];`,
      ].join("\n");
    });

  return `${BANNER}\n\n${blocks.join("\n\n")}\n`;
}

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

  const contractsOutput = renderContracts(readFileSync(contractsPath, "utf8"));
  writeFileSync(contractsOutPath, contractsOutput, "utf8");
  console.log(
    `Generated ${path.relative(process.cwd(), contractsOutPath)} from ${path.relative(process.cwd(), contractsPath)}`,
  );
}

main().catch((error) => {
  console.error("Failed to generate @cove/types from the OpenAPI document", error);
  process.exit(1);
});

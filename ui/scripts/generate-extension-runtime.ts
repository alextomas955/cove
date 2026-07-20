import * as fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  extensionRuntimeVersionDefinitions,
  type ExtensionRuntimeModule,
  type ExtensionRuntimeVersionDefinition,
} from "./extension-runtime-contract.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function runtimeDirFor(version: string) {
  return path.resolve(__dirname, `../src/generated/extensions/runtime/${version}`);
}

function buildRuntimeSource(source: string, exportNames: string[], hasDefault: boolean) {
  const lines = [
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    "// @ts-nocheck",
    `// Generated from package exports for ${source}.`,
    `import * as runtimeModule from ${JSON.stringify(source)};`,
    "",
  ];

  if (hasDefault) {
    lines.push(
      'const runtimeDefault = Object.prototype.hasOwnProperty.call(runtimeModule, "default")',
      "  ? runtimeModule.default",
      "  : runtimeModule;",
      "",
      "export default runtimeDefault;",
      ""
    );
  }

  for (const exportName of exportNames) {
    lines.push(`export const ${exportName} = runtimeModule.${exportName};`);
  }

  if (exportNames.length === 0 && !hasDefault) {
    lines.push("export {};");
  }

  lines.push("");
  return lines.join("\n");
}

function buildTypeSource(source: string, hasDefault: boolean) {
  const lines = [
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    `export * from ${JSON.stringify(source)};`,
  ];

  if (hasDefault) {
    lines.push(`export { default } from ${JSON.stringify(source)};`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Enumerate the named exports of a built ESM barrel by reading its `export { ... } from` blocks.
 * Used for modules whose runtime cannot be loaded by the Node/tsx module loader (the SDK re-exports
 * host-key constants from a types-only package with no runtime entry), but whose value surface is
 * fully described by the barrel it ships.
 */
async function readStaticExportNames(specifier: string): Promise<string[]> {
  const barrelPath = fileURLToPath(import.meta.resolve(specifier));
  const source = await fs.readFile(barrelPath, "utf8");
  const names = new Set<string>();
  const exportBlock = /export\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = exportBlock.exec(source)) !== null) {
    for (const rawEntry of match[1].split(",")) {
      const entry = rawEntry.trim();
      if (!entry) continue;
      // `X as Y` re-exports the module under the alias Y.
      const exported = (entry.includes(" as ") ? entry.split(/\s+as\s+/).pop()! : entry).trim();
      if (exported !== "default" && identifierPattern.test(exported)) {
        names.add(exported);
      }
    }
  }
  return [...names].sort();
}

async function generateRuntimeModule(runtimeDir: string, definition: ExtensionRuntimeModule) {
  let exportNames: string[];
  let hasDefault: boolean;

  if (definition.staticExportsFrom) {
    exportNames = await readStaticExportNames(definition.staticExportsFrom);
    hasDefault = false;
  } else {
    const moduleNamespace = await import(definition.source as string);
    exportNames = Object.keys(moduleNamespace)
      .filter((name) => name !== "default" && name !== "__esModule" && identifierPattern.test(name))
      .sort();
    hasDefault = Object.prototype.hasOwnProperty.call(moduleNamespace, "default");
  }

  await fs.writeFile(
    path.join(runtimeDir, definition.sourceFileName),
    buildRuntimeSource(definition.source as string, exportNames, hasDefault),
    "utf8"
  );
  await fs.writeFile(
    path.join(runtimeDir, definition.sourceFileName.replace(/\.ts$/, ".d.ts")),
    buildTypeSource(definition.source as string, hasDefault),
    "utf8"
  );
}

async function generateContractModule(runtimeDir: string, def: ExtensionRuntimeVersionDefinition) {
  const contractPath = path.join(runtimeDir, "contract.ts");
  const typePath = path.join(runtimeDir, "contract.d.ts");
  const moduleSpecifiers = def.modules.map((definition) => definition.specifier);

  const contractSource = [
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    `export const extensionRuntimeVersion = ${JSON.stringify(def.version)};`,
    `export const sharedModuleSpecifiers = ${JSON.stringify(moduleSpecifiers, null, 2)};`,
    "",
  ].join("\n");

  const typeSource = [
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    `export declare const extensionRuntimeVersion: ${JSON.stringify(def.version)};`,
    "export declare const sharedModuleSpecifiers: readonly string[];",
    "",
  ].join("\n");

  await fs.writeFile(contractPath, contractSource, "utf8");
  await fs.writeFile(typePath, typeSource, "utf8");
}

async function generateVersion(def: ExtensionRuntimeVersionDefinition) {
  const runtimeDir = runtimeDirFor(def.version);
  await fs.rm(runtimeDir, { recursive: true, force: true });
  await fs.mkdir(runtimeDir, { recursive: true });

  for (const definition of def.modules) {
    if (definition.source) {
      await generateRuntimeModule(runtimeDir, definition);
    }
  }

  // Write the components barrel (source is null – it re-exports a local barrel)
  const componentsBarrel = [
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    '// Re-exports the shared component barrel for extensions.',
    'export * from "../../../../components/extension-shared";',
    "",
  ].join("\n");
  const componentsType = [
    "// AUTO-GENERATED FILE. DO NOT EDIT.",
    'export * from "../../../../components/extension-shared";',
    "",
  ].join("\n");
  await fs.writeFile(path.join(runtimeDir, "components.ts"), componentsBarrel, "utf8");
  await fs.writeFile(path.join(runtimeDir, "components.d.ts"), componentsType, "utf8");

  await generateContractModule(runtimeDir, def);
  console.log(`Generated Cove extension runtime modules in ${runtimeDir}`);
}

async function main() {
  for (const def of extensionRuntimeVersionDefinitions) {
    await generateVersion(def);
  }
}

main().catch((error) => {
  console.error("Failed to generate extension runtime modules", error);
  process.exit(1);
});

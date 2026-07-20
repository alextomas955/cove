export interface ExtensionRuntimeModule {
  id: string;
  source: string | null;
  specifier: string;
  sourceFileName: string;
  outputFileName: string;
  legacySpecifiers: string[];
  /**
   * When set, the generator reads this built ESM barrel's named exports (instead of importing the
   * module) to enumerate the re-export shim. Used for the workspace SDK, whose types-only
   * dependency has no runtime entry the Node/tsx loader can execute, but whose public surface is
   * fully described by its built barrel.
   */
  staticExportsFrom?: string;
}

export interface ExtensionRuntimeVersionDefinition {
  version: string;
  modules: ExtensionRuntimeModule[];
}

// Shared modules provided to extensions by the host. Each is served as a single chunk the browser
// import-map redirects both the canonical `@cove/runtime/*` specifier and its bare
// `legacySpecifiers` to, so an extension that externalizes these imports resolves the host's one
// module instance instead of bundling its own copy.
const baseModules: ExtensionRuntimeModule[] = [
  {
    id: "react",
    source: "react",
    specifier: "@cove/runtime/react",
    sourceFileName: "react.ts",
    outputFileName: "react.js",
    legacySpecifiers: ["react"],
  },
  {
    id: "react-dom",
    source: "react-dom",
    specifier: "@cove/runtime/react-dom",
    sourceFileName: "react-dom.ts",
    outputFileName: "react-dom.js",
    legacySpecifiers: ["react-dom"],
  },
  {
    id: "react-dom-client",
    source: "react-dom/client",
    specifier: "@cove/runtime/react-dom-client",
    sourceFileName: "react-dom-client.ts",
    outputFileName: "react-dom-client.js",
    legacySpecifiers: ["react-dom/client"],
  },
  {
    id: "react-jsx-runtime",
    source: "react/jsx-runtime",
    specifier: "@cove/runtime/react-jsx-runtime",
    sourceFileName: "react-jsx-runtime.ts",
    outputFileName: "react-jsx-runtime.js",
    legacySpecifiers: ["react/jsx-runtime"],
  },
  {
    id: "react-jsx-dev-runtime",
    source: "react/jsx-dev-runtime",
    specifier: "@cove/runtime/react-jsx-dev-runtime",
    sourceFileName: "react-jsx-dev-runtime.ts",
    outputFileName: "react-jsx-dev-runtime.js",
    legacySpecifiers: ["react/jsx-dev-runtime"],
  },
  {
    id: "react-query",
    source: "@tanstack/react-query",
    specifier: "@cove/runtime/react-query",
    sourceFileName: "react-query.ts",
    outputFileName: "react-query.js",
    legacySpecifiers: ["@tanstack/react-query"],
  },
  {
    id: "lucide-react",
    source: "lucide-react",
    specifier: "@cove/runtime/lucide-react",
    sourceFileName: "lucide-react.ts",
    outputFileName: "lucide-react.js",
    legacySpecifiers: ["lucide-react"],
  },
  {
    id: "components",
    source: null as any, // local barrel – not auto-generated
    specifier: "@cove/runtime/components",
    sourceFileName: "components.ts",
    outputFileName: "components.js",
    legacySpecifiers: [],
  },
];

// The Cove extension SDK, provided to extensions as one more shared module. Its runtime chunk is a
// re-export shim over the host's own SDK instance, so an extension that externalizes it shares the
// single host SDK — and, through it, the host's single React and QueryClient.
const extensionSdkModule: ExtensionRuntimeModule = {
  id: "extension-sdk",
  source: "@cove/extension-sdk",
  specifier: "@cove/runtime/extension-sdk",
  sourceFileName: "extension-sdk.ts",
  outputFileName: "extension-sdk.js",
  legacySpecifiers: ["@cove/extension-sdk"],
  staticExportsFrom: "@cove/extension-sdk",
};

// v1: the original shared-module set. v2: additive — v1 plus the shared SDK module. v2 is a strict
// superset of v1, so serving the v2 import-map also satisfies extensions built against v1.
const v1Modules: ExtensionRuntimeModule[] = baseModules;
const v2Modules: ExtensionRuntimeModule[] = [...baseModules, extensionSdkModule];

export const extensionRuntimeVersionDefinitions: ExtensionRuntimeVersionDefinition[] = [
  { version: "v1", modules: v1Modules },
  { version: "v2", modules: v2Modules },
];

/**
 * The latest runtime contract version the host serves in the document import-map and advertises via
 * the runtime-version meta tag. Because v2 is a superset of v1, this map resolves the shared modules
 * for both v1 and v2 extensions.
 */
export const latestExtensionRuntimeVersion = "v2";

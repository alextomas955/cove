import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { extensionRuntimeVersionDefinitions, latestExtensionRuntimeVersion } from "./scripts/extension-runtime-contract.ts";

// Exposes the repo-root CHANGELOG.md to the app as `virtual:changelog-raw`.
// Reading it via fs (instead of a cross-package import) keeps CHANGELOG.md as the
// single source of truth while staying robust to where the UI is built from
// (local, CI, or the Docker frontend stage). Falls back to an empty string if absent.
function changelogPlugin() {
  const virtualId = "virtual:changelog-raw";
  const resolvedId = "\0" + virtualId;
  const changelogPath = path.resolve(__dirname, "..", "CHANGELOG.md");
  return {
    name: "cove-changelog",
    resolveId(id: string) {
      return id === virtualId ? resolvedId : null;
    },
    load(id: string) {
      if (id !== resolvedId) return null;
      let raw = "";
      try {
        raw = fs.readFileSync(changelogPath, "utf-8");
      } catch {
        raw = "";
      }
      return `export default ${JSON.stringify(raw)};`;
    },
  };
}

// Rollup input name for a runtime module chunk, namespaced per version so v1 and v2 coexist. v1
// keeps its original (unversioned) name so its emitted asset path stays byte-identical.
function runtimeInputName(version: string, id: string) {
  return version === "v1" ? `extension-runtime-${id}` : `extension-runtime-${version}-${id}`;
}

const extensionRuntimeEntries = Object.fromEntries(
  extensionRuntimeVersionDefinitions.flatMap((def) =>
    def.modules.map((definition) => [
      runtimeInputName(def.version, definition.id),
      path.resolve(__dirname, `./src/generated/extensions/runtime/${def.version}/${definition.sourceFileName}`),
    ])
  )
);

const extensionRuntimeFileNames = new Map<string, string>(
  extensionRuntimeVersionDefinitions.flatMap((def) =>
    def.modules.map((definition) => [
      runtimeInputName(def.version, definition.id),
      `assets/extension-runtime/${def.version}/${definition.outputFileName}`,
    ])
  )
);

function buildExtensionImportMap(useDevRuntimeModules: boolean, version: string) {
  const def = extensionRuntimeVersionDefinitions.find((candidate) => candidate.version === version);
  if (!def) {
    throw new Error(`Unknown extension runtime version: ${version}`);
  }
  return Object.fromEntries(
    def.modules.flatMap((definition) => {
      const target = useDevRuntimeModules
        ? `/src/generated/extensions/runtime/${version}/${definition.sourceFileName}`
        : `/${extensionRuntimeFileNames.get(runtimeInputName(version, definition.id))!}`;
      return [definition.specifier, ...definition.legacySpecifiers].map((specifier) => [specifier, target]);
    })
  );
}

function extensionRuntimeImportMapPlugin(useDevRuntimeModules: boolean) {
  return {
    name: "extension-runtime-import-map",
    transformIndexHtml() {
      // The document serves the latest runtime version; being a superset of v1, its import-map
      // resolves the shared modules for both v1 and v2 extensions.
      const servedVersion = latestExtensionRuntimeVersion;
      const importMap = JSON.stringify({ imports: buildExtensionImportMap(useDevRuntimeModules, servedVersion) }, null, 2);
      return [
        {
          tag: "meta",
          attrs: {
            name: "cove-extension-runtime-version",
            content: servedVersion,
          },
          injectTo: "head",
        },
        {
          tag: "script",
          attrs: {
            type: "importmap",
          },
          children: importMap,
          injectTo: "head",
        },
      ];
    },
  };
}

export default defineConfig(({ command }) => {
  const useDevRuntimeModules = command === "serve";

  return {
    plugins: [react(), tailwindcss(), changelogPlugin(), extensionRuntimeImportMapPlugin(useDevRuntimeModules)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // The workspace types package ships TypeScript sources only (no runtime entry point); alias
        // it so the runtime host-key constants it re-exports resolve when bundling the shared SDK.
        "@cove/types": path.resolve(__dirname, "../sdk/types/index.ts"),
      },
      // Ensure the shared SDK and the host reference one copy of React and React Query, so an
      // extension loaded through the runtime import-map shares the host's singletons rather than a
      // second copy pulled in transitively through the workspace-linked SDK.
      dedupe: ["react", "react-dom", "@tanstack/react-query", "lucide-react"],
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:5073",
          changeOrigin: true,
        },
        "/hubs": {
          target: "http://localhost:5073",
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: "../src/Cove.Api/wwwroot",
      emptyOutDir: true,
      rollupOptions: {
        preserveEntrySignatures: "strict",
        input: {
          index: path.resolve(__dirname, "./index.html"),
          ...extensionRuntimeEntries,
        },
        output: {
          entryFileNames: (chunkInfo) => extensionRuntimeFileNames.get(chunkInfo.name) ?? "assets/[name]-[hash].js",
          manualChunks: {
            vendor: ["react", "react-dom", "@tanstack/react-query"],
            icons: ["lucide-react"],
            signalr: ["@microsoft/signalr"],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
  };
});

// Fixture for the runtime/v2 cross-bundle sharing check. This module is built as a SEPARATE bundle
// (see runtimeSharing.crossbundle.test.tsx) with react, @tanstack/react-query and @cove/extension-sdk
// marked external — exactly as a real extension build externalizes the host-provided shared modules
// so the runtime import-map redirects them to the single host copy.
import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createCoveClient } from "@cove/extension-sdk";

// Expose the exact React the separately-built bundle imported, so the host can assert it is the same
// instance it uses (referential module identity proves a single React, hence one hooks dispatcher).
export const extensionReact = React;

// Reference the SDK so the extension build must externalize @cove/extension-sdk (the additive v2
// module). A bundled copy would inline the SDK — and, with it, a second React Query — here.
export const extensionSdkClientFactory = createCoveClient;

/** Reports the QueryClient the extension resolves through the shared React Query context. */
export function QueryClientProbe({ onResolved }: { onResolved: (client: unknown) => void }) {
  const client = useQueryClient();
  useEffect(() => {
    onResolved(client);
  }, [client, onResolved]);
  return React.createElement("div", { "data-testid": "probe" }, "probe");
}

import { startFrontendBuildMonitor } from "./frontendBuild";
import { showFrontendUpdate } from "./frontendUpdate";
// Must stay on the synchronous entry: only then does Vite emit a <link rel="stylesheet"> into
// index.html. Reached through the dynamic import below it lands in an async chunk that the bundle
// injects from JS, and the page renders unstyled white until it arrives.
import "./index.css";

// Install the detector before importing the application or any lazy chunks.
if (import.meta.env.PROD) {
  startFrontendBuildMonitor(__COVE_FRONTEND_BUILD_ID__, showFrontendUpdate);
}

void import("./mount");

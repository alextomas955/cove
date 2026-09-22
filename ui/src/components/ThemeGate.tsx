import { useEffect, useState, type ReactNode } from "react";
import { useExtensions } from "../extensions/ExtensionLoader";
import { hasBootedLook } from "../theme/themeBoot";

// A theme is only known once /me and the manifest resolve, and the manifest needs a signed-in user,
// so a first sign-in on a new browser has nothing cached to pre-paint from. Hold the spinner the
// surrounding gates already use rather than render the app in the default palette and repaint it.
//
// Read once, at startup: a page the boot script already painted has nothing to wait for.
const bootedLookAtStartup = hasBootedLook();

// A manifest that never settles must not hold the app hostage; past this the default palette wins.
const THEME_SETTLE_TIMEOUT_MS = 2000;

export function ThemeGate({ children }: { children: ReactNode }) {
  const { loaded } = useExtensions();
  const [settleTimedOut, setSettleTimedOut] = useState(false);
  const waiting = !loaded && !bootedLookAtStartup && !settleTimedOut;

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => setSettleTimedOut(true), THEME_SETTLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [waiting]);

  if (waiting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return <>{children}</>;
}

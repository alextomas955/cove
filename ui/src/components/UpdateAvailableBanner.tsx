import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { updates } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { navigateToUrl } from "../router/location";

export const UPDATES_SETTINGS_PATH = "/settings/system-info/updates";
export const updateStatusQueryKey = ["updates", "status"] as const;

function dismissalKey(kind: "update" | "rollback", version: string) {
  return kind === "update" ? `cove.update.dismissed.${version}` : `cove.update.rollback.dismissed.${version}`;
}

function readDismissed(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * A non-blocking notice for users who can install updates: a new version is available, or the last
 * update failed and was rolled back. Each is dismissible per version.
 */
export function UpdateAvailableBanner() {
  const { hasPermission } = useAuth();
  const allowed = hasPermission("system.update");
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const { data: status } = useQuery({
    queryKey: updateStatusQueryKey,
    queryFn: updates.status,
    enabled: allowed,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    meta: { suppressGlobalError: true },
  });

  if (!allowed || !status) return null;

  const rolledBack = status.applyState === "rolledBack" && status.failedVersion ? status.failedVersion : null;
  const available = status.updateAvailable && status.showBanner && status.latest ? status.latest.version : null;
  const kind = rolledBack ? "rollback" : available ? "update" : null;
  const version = rolledBack ?? available;
  if (!kind || !version) return null;

  const key = dismissalKey(kind, version);
  if (dismissedKey === key || readDismissed(key)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Storage may be unavailable (private mode); the notice then stays hidden until the page reloads.
    }
    setDismissedKey(key);
  };

  return (
    <div
      role={kind === "rollback" ? "alert" : "status"}
      className={`fixed bottom-4 left-4 right-4 z-[18990] rounded-lg border bg-card p-4 shadow-xl sm:right-auto sm:max-w-md ${
        kind === "rollback" ? "border-red-500/40" : "border-accent/40"
      }`}
    >
      <p className="font-semibold">
        {kind === "rollback" ? `Update to ${version} failed and was rolled back` : `Cove ${version} is available`}
      </p>
      <p className="mt-1 text-sm text-secondary">
        {kind === "rollback"
          ? `Cove ${status.currentVersion} is running again.`
          : `You are running ${status.currentVersion}.`}
      </p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <a
          href={UPDATES_SETTINGS_PATH}
          className="text-sm text-accent underline"
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigateToUrl(UPDATES_SETTINGS_PATH);
          }}
        >
          {kind === "rollback" ? "View details" : "View update"}
        </a>
        <button type="button" className="text-sm text-secondary" onClick={dismiss} aria-label="Dismiss update notice">
          Dismiss
        </button>
      </div>
    </div>
  );
}

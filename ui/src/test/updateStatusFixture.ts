import type { UpdateStatus } from "../api/types";

export function updateStatus(overrides: Partial<UpdateStatus> = {}): UpdateStatus {
  return {
    currentVersion: "1.4.1",
    channel: "auto",
    effectiveChannel: "stable",
    installKind: "native",
    launchMode: "direct",
    rid: "linux-x64",
    canApply: true,
    updateAvailable: true,
    latest: { version: "1.5.0", notesMarkdown: "## [1.5.0]\n- New things", requiresMigration: false },
    applyState: "idle",
    previousVersionAvailable: false,
    otherInstancesSharingBinary: [],
    showBanner: true,
    settings: {
      checkEnabled: true,
      channel: "auto",
      checkIntervalHours: 12,
      showBanner: true,
      autoUpdate: "off",
      autoUpdateWindow: "03:00-05:00",
    },
    ...overrides,
  };
}

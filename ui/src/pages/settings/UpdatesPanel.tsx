import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { jobs, updates } from "../../api/client";
import type { UpdateStatus, UpdatesConfig } from "../../api/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { MarkdownText } from "../../components/NarrativeText";
import { updateStatusQueryKey } from "../../components/UpdateAvailableBanner";
import {
  CheckboxLabel,
  InfoPair,
  NumberField,
  SectionCard,
  SelectField,
  SettingsButton,
  TextField,
} from "../../components/SettingsPrimitives";

const channelOptions = [
  { value: "auto", label: "Automatic (follow this build)" },
  { value: "stable", label: "Stable" },
  { value: "prerelease", label: "Prerelease" },
  { value: "nightly", label: "Nightly" },
] as const;

const autoUpdateOptions = [
  { value: "off", label: "Off" },
  { value: "safe", label: "Safe updates only (same major version, no database migrations)" },
  { value: "all", label: "All updates" },
] as const;

const installKindLabels: Record<UpdateStatus["installKind"], string> = {
  docker: "Docker",
  native: "Native",
  source: "Development build",
};

const launchModeLabels: Record<UpdateStatus["launchMode"], string> = {
  direct: "started directly",
  "instance-manager": "Instance Manager",
  systemd: "systemd",
};

function isBusy(status: UpdateStatus | undefined) {
  return status?.applyState === "downloading" || status?.applyState === "applying";
}

/** API errors arrive as "API Error 409: {problem json}"; show the problem's detail when there is one. */
export function describeUpdateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const json = message.indexOf("{");
  if (json >= 0) {
    try {
      const problem = JSON.parse(message.slice(json)) as { detail?: string; title?: string };
      if (problem.detail || problem.title) return problem.detail ?? problem.title ?? message;
    } catch {
      // Not JSON; fall through to the raw message.
    }
  }
  return message;
}

function formatDate(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatSize(bytes?: number | null) {
  if (!bytes) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function restartDescription(status: UpdateStatus) {
  switch (status.launchMode) {
    case "systemd":
      return "Cove then exits with code 75 so systemd starts the new version. This needs Restart=on-failure (or RestartForceExitStatus=75) in the service unit.";
    case "instance-manager":
      return "Cove then restarts this instance through its Instance Manager start script.";
    default:
      return "Cove then stops and starts the new version with the same settings; this page reconnects when it is back.";
  }
}

export function UpdatesPanel() {
  const queryClient = useQueryClient();
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmJobs, setConfirmJobs] = useState<string | null>(null);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [draft, setDraft] = useState<UpdatesConfig | null>(null);

  const statusQuery = useQuery({
    queryKey: updateStatusQueryKey,
    queryFn: updates.status,
    refetchInterval: (query) => (isBusy(query.state.data) ? 2000 : false),
  });
  const status = statusQuery.data;

  const jobQuery = useQuery({
    queryKey: ["updates", "job", status?.applyJobId],
    queryFn: () => jobs.get(status!.applyJobId!),
    enabled: isBusy(status) && !!status?.applyJobId,
    refetchInterval: 1000,
  });

  const setStatus = (next: UpdateStatus) => queryClient.setQueryData(updateStatusQueryKey, next);

  const checkMutation = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: () => updates.check(),
    onSuccess: (next) => {
      setStatus(next);
      setNotice(next.updateAvailable ? null : { type: "info", text: "Cove is up to date." });
    },
    onError: (error) => setNotice({ type: "error", text: describeUpdateError(error) }),
  });

  const applyMutation = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: (force: boolean) => updates.apply(force),
    onSuccess: () => {
      setConfirmApply(false);
      setConfirmJobs(null);
      setNotice(null);
      void queryClient.invalidateQueries({ queryKey: updateStatusQueryKey });
    },
    onError: (error, force) => {
      setConfirmApply(false);
      const message = describeUpdateError(error);
      if (!force && message.includes("Jobs are running")) {
        setConfirmJobs(message);
        return;
      }
      setConfirmJobs(null);
      setNotice({ type: "error", text: message });
    },
  });

  const revertMutation = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: () => updates.revert(),
    onSuccess: (result) => {
      setConfirmRevert(false);
      setNotice({ type: "info", text: result.message });
      void queryClient.invalidateQueries({ queryKey: updateStatusQueryKey });
    },
    onError: (error) => {
      setConfirmRevert(false);
      setNotice({ type: "error", text: describeUpdateError(error) });
    },
  });

  const saveSettingsMutation = useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: (settings: UpdatesConfig) => updates.saveSettings(settings),
    onSuccess: (next) => {
      setStatus(next);
      setDraft(null);
      setNotice({ type: "info", text: "Update settings saved." });
    },
    onError: (error) => setNotice({ type: "error", text: describeUpdateError(error) }),
  });

  if (statusQuery.isLoading) {
    return (
      <SectionCard title="Updates">
        <p className="flex items-center gap-2 text-sm text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading update status…
        </p>
      </SectionCard>
    );
  }

  if (!status) {
    return (
      <SectionCard title="Updates">
        <p className="text-sm text-red-400">
          {statusQuery.error ? describeUpdateError(statusQuery.error) : "Update status is unavailable."}
        </p>
      </SectionCard>
    );
  }

  const settings = draft ?? status.settings;
  const latest = status.latest;
  const busy = isBusy(status);
  const job = jobQuery.data;

  return (
    <>
      <SectionCard
        title="Cove updates"
        description="Cove checks its release feed in the background and can install updates for native installs."
        actions={
          <SettingsButton onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending || busy}>
            {checkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Check now
          </SettingsButton>
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoPair label="Current version" value={status.currentVersion} />
          <InfoPair
            label="Channel"
            value={status.channel === "auto" ? `Automatic (${status.effectiveChannel})` : status.effectiveChannel}
          />
          <InfoPair
            label="Install"
            value={
              status.installKind === "native"
                ? `${installKindLabels.native}, ${launchModeLabels[status.launchMode]}`
                : installKindLabels[status.installKind]
            }
          />
          <InfoPair label="Last checked" value={formatDate(status.lastCheckedAt)} />
        </dl>
        {status.lastError ? (
          <p className="mt-3 text-sm text-yellow-500">The last check failed: {status.lastError}</p>
        ) : null}
        {notice ? (
          <p
            role={notice.type === "error" ? "alert" : "status"}
            className={`mt-3 text-sm ${notice.type === "error" ? "text-red-400" : "text-secondary"}`}
          >
            {notice.text}
          </p>
        ) : null}
      </SectionCard>

      {status.applyState === "rolledBack" || status.applyState === "failed" ? (
        <SectionCard
          title={
            status.applyState === "rolledBack"
              ? `Update to ${status.failedVersion ?? "the new version"} failed and was rolled back`
              : `Update${status.failedVersion ? ` to ${status.failedVersion}` : ""} failed`
          }
          className="border-red-500/40"
        >
          <p className="text-sm text-secondary">{status.applyMessage}</p>
          <p className="mt-2 text-sm text-secondary">
            Cove {status.currentVersion} is running. The pre-update database backup is under Operations → Backup &amp;
            Restore if you need it.
          </p>
          {status.logTail ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-secondary">Log from the failed start</summary>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-card p-3 text-xs text-secondary">
                {status.logTail}
              </pre>
            </details>
          ) : null}
        </SectionCard>
      ) : null}

      {busy || status.applyState === "staged" ? (
        <SectionCard title={status.applyState === "staged" ? "Restart required" : "Installing update"}>
          <p className="flex items-center gap-2 text-sm text-secondary" role="status">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {job?.subTask ?? status.applyMessage}
          </p>
          {busy && job ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${Math.round(job.progress * 100)}%` }}
              />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {status.updateAvailable && latest ? (
        <SectionCard
          title={`Cove ${latest.version} is available`}
          description={[
            latest.publishedAt ? `Released ${formatDate(latest.publishedAt)}` : null,
            formatSize(latest.assetSize),
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          {latest.requiresMigration ? (
            <p className="mb-3 rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-3 py-2 text-sm text-secondary">
              This release includes database migrations. After updating, run them from the migration prompt; until then
              you can still revert to {status.currentVersion}.
            </p>
          ) : null}
          {latest.notesMarkdown ? (
            <div className="max-h-96 overflow-auto rounded-lg border border-border bg-card p-4 text-sm text-secondary">
              <MarkdownText>{latest.notesMarkdown}</MarkdownText>
            </div>
          ) : null}
          {latest.notesUrl ? (
            <a
              href={latest.notesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-accent hover:underline"
            >
              Full release notes
            </a>
          ) : null}
          <div className="mt-4">
            <UpdateActions
              status={status}
              busy={busy || applyMutation.isPending}
              onInstall={() => setConfirmApply(true)}
            />
          </div>
        </SectionCard>
      ) : null}

      {status.previousVersion && (status.previousVersionAvailable || status.revertUnavailableReason) ? (
        <SectionCard
          title="Previous version"
          description={`Cove ${status.previousVersion} was replaced by the last update.`}
        >
          {status.previousVersionAvailable ? (
            <SettingsButton onClick={() => setConfirmRevert(true)} disabled={busy || revertMutation.isPending}>
              <RotateCcw className="h-4 w-4" />
              Revert to {status.previousVersion}
            </SettingsButton>
          ) : (
            <p className="text-sm text-secondary">{status.revertUnavailableReason}</p>
          )}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Update settings"
        description="These apply to the whole server."
        actions={
          <SettingsButton
            variant="primary"
            disabled={!draft || saveSettingsMutation.isPending}
            onClick={() => draft && saveSettingsMutation.mutate(draft)}
          >
            Save
          </SettingsButton>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <CheckboxLabel
            label="Check for updates automatically"
            checked={settings.checkEnabled}
            onChange={(checkEnabled) => setDraft({ ...settings, checkEnabled })}
          />
          <CheckboxLabel
            label="Show the update banner"
            description="Shows a dismissible notice to users who can install updates."
            checked={settings.showBanner}
            onChange={(showBanner) => setDraft({ ...settings, showBanner })}
          />
          <SelectField
            label="Channel"
            value={settings.channel}
            options={channelOptions}
            onChange={(channel) => setDraft({ ...settings, channel: channel as UpdatesConfig["channel"] })}
          />
          <NumberField
            label="Check interval (hours)"
            value={settings.checkIntervalHours}
            min={1}
            max={168}
            onChange={(hours) => setDraft({ ...settings, checkIntervalHours: hours ?? 12 })}
          />
          <SelectField
            label="Automatic updates"
            value={settings.autoUpdate}
            options={autoUpdateOptions}
            disabled={status.installKind !== "native"}
            description={
              status.installKind === "native"
                ? "Installs updates by itself inside the window below, only while no jobs are running."
                : "Only native installs can update themselves."
            }
            onChange={(autoUpdate) => setDraft({ ...settings, autoUpdate: autoUpdate as UpdatesConfig["autoUpdate"] })}
          />
          <TextField
            label="Automatic update window"
            value={settings.autoUpdateWindow}
            placeholder="03:00-05:00"
            description="Local server time, HH:mm-HH:mm."
            onChange={(autoUpdateWindow) => setDraft({ ...settings, autoUpdateWindow })}
          />
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmApply}
        title={`Install Cove ${latest?.version ?? ""}?`}
        message={[
          "Cove will download and verify the update, back up the database and configuration (pre_update), and replace the Cove and Instance Manager executables.",
          restartDescription(status),
          "If the new version does not start, the previous version is restored automatically.",
          status.otherInstancesSharingBinary.length > 0
            ? `Other instances use the same executable (${status.otherInstancesSharingBinary.join(", ")}). They keep running the old version until restarted and are not backed up by this update; back them up first.`
            : null,
        ]
          .filter(Boolean)
          .join(" ")}
        confirmLabel="Download & install"
        destructive={false}
        isPending={applyMutation.isPending}
        onConfirm={() => applyMutation.mutate(false)}
        onCancel={() => setConfirmApply(false)}
      />
      <ConfirmDialog
        open={confirmJobs !== null}
        title="Jobs are running"
        message={`${confirmJobs ?? ""} Installing restarts Cove, which interrupts them.`}
        confirmLabel="Install anyway"
        isPending={applyMutation.isPending}
        onConfirm={() => applyMutation.mutate(true)}
        onCancel={() => setConfirmJobs(null)}
      />
      <ConfirmDialog
        open={confirmRevert}
        title={`Revert to Cove ${status.previousVersion ?? ""}?`}
        message={`Cove will restore the previous executables and restart. ${restartDescription(status)}`}
        confirmLabel="Revert"
        isPending={revertMutation.isPending}
        onConfirm={() => revertMutation.mutate()}
        onCancel={() => setConfirmRevert(false)}
      />
    </>
  );
}

function UpdateActions({ status, busy, onInstall }: { status: UpdateStatus; busy: boolean; onInstall: () => void }) {
  if (status.installKind === "docker") {
    return (
      <div className="space-y-2 text-sm text-secondary" data-testid="update-docker-instructions">
        <p>This Cove runs in Docker. Update it by pulling the new image, after backing up:</p>
        <pre className="overflow-x-auto rounded-lg bg-card p-3 text-xs text-foreground">
          docker compose pull &amp;&amp; docker compose up -d
        </pre>
        <p>
          The <code>latest</code> tag follows stable releases, <code>X.Y</code> stays on one minor line, and{" "}
          <code>nightly</code> follows development builds. A pinned version tag must be changed in your compose file.
        </p>
      </div>
    );
  }

  if (!status.canApply) {
    const downloadUrl = status.latest?.notesUrl ?? status.releasesUrl;
    return (
      <div className="space-y-2 text-sm text-secondary" data-testid="update-manual-instructions">
        {status.cannotApplyReason ? <p>{status.cannotApplyReason}</p> : null}
        <p>To update manually:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Back up from Operations → Backup &amp; Restore.</li>
          <li>Stop Cove.</li>
          <li>
            Download the archive for your platform{status.rid ? ` (${status.rid})` : ""} and replace the Cove and
            Cove.InstanceManager executables with the ones inside it.
          </li>
          <li>Start Cove. Your data folder is not touched.</li>
        </ol>
        {downloadUrl ? (
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Download from GitHub
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <SettingsButton variant="primary" onClick={onInstall} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Download &amp; install
    </SettingsButton>
  );
}

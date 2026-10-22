import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateStatus } from "../api/types";
import { UpdatesPanel, describeUpdateError } from "../pages/settings/UpdatesPanel";
import { readSettingsTabFromUrl } from "../pages/SettingsPage";
import { updateStatus } from "./updateStatusFixture";

const { mockUpdates, mockJobs } = vi.hoisted(() => ({
  mockUpdates: { status: vi.fn(), check: vi.fn(), apply: vi.fn(), revert: vi.fn(), saveSettings: vi.fn() },
  mockJobs: { get: vi.fn() },
}));

vi.mock("../api/client", () => ({ updates: mockUpdates, jobs: mockJobs }));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ user: null, hasPermission: () => true }) }));

function renderPanel(status: UpdateStatus) {
  mockUpdates.status.mockResolvedValue(status);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UpdatesPanel />
    </QueryClientProvider>,
  );
}

describe("UpdatesPanel", () => {
  beforeEach(() => {
    mockJobs.get.mockResolvedValue({ id: "job", progress: 0.3, status: "running" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows Docker users the pull instructions and never an install button", async () => {
    renderPanel(
      updateStatus({ installKind: "docker", canApply: false, cannotApplyReason: "Cove runs in a container." }),
    );

    expect(await screen.findByTestId("update-docker-instructions")).toHaveTextContent(
      "docker compose pull && docker compose up -d",
    );
    expect(screen.queryByRole("button", { name: /Download & install/ })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Automatic updates/i })).toBeDisabled();
  });

  it("shows manual steps and a download link when this install cannot update itself", async () => {
    renderPanel(
      updateStatus({
        canApply: false,
        cannotApplyReason: "Cove cannot write to its program folder (/opt/cove).",
        latest: { version: "1.5.0", notesUrl: "https://github.com/yourcove/cove/releases/tag/v1.5.0" },
      }),
    );

    const manual = await screen.findByTestId("update-manual-instructions");
    expect(manual).toHaveTextContent("cannot write to its program folder");
    expect(within(manual).getByRole("link", { name: "Download from GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/yourcove/cove/releases/tag/v1.5.0",
    );
    expect(screen.queryByRole("button", { name: /Download & install/ })).not.toBeInTheDocument();
  });

  it("renders the release notes as markdown and installs after confirmation", async () => {
    mockUpdates.apply.mockResolvedValue({ jobId: "job", message: "Updating" });
    renderPanel(updateStatus({ launchMode: "systemd" }));

    expect(await screen.findByRole("heading", { name: "[1.5.0]" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Download & install/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("back up the database and configuration");
    expect(dialog).toHaveTextContent("Restart=on-failure");
    fireEvent.click(within(dialog).getByRole("button", { name: "Download & install" }));

    await waitFor(() => expect(mockUpdates.apply).toHaveBeenCalledWith(false));
  });

  it("asks again before interrupting running jobs", async () => {
    mockUpdates.apply
      .mockRejectedValueOnce(new Error('API Error 409: {"detail":"Jobs are running. Wait for them to finish."}'))
      .mockResolvedValueOnce({ jobId: "job", message: "Updating" });
    renderPanel(updateStatus());

    fireEvent.click(await screen.findByRole("button", { name: /Download & install/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Download & install" }));
    fireEvent.click(await screen.findByRole("button", { name: "Install anyway" }));

    await waitFor(() => expect(mockUpdates.apply).toHaveBeenLastCalledWith(true));
  });

  it("shows a rolled-back update with the log from the failed start", async () => {
    renderPanel(
      updateStatus({
        updateAvailable: false,
        latest: null,
        applyState: "rolledBack",
        failedVersion: "1.5.0",
        applyMessage: "Cove 1.5.0 exited during startup.",
        logTail: "database exploded",
      }),
    );

    expect(await screen.findByText("Update to 1.5.0 failed and was rolled back")).toBeInTheDocument();
    expect(screen.getByText("Cove 1.5.0 exited during startup.")).toBeInTheDocument();
    expect(screen.getByText("database exploded")).toBeInTheDocument();
  });

  it("offers revert while the previous version can still use the database", async () => {
    mockUpdates.revert.mockResolvedValue({ message: "Restarting into Cove 1.4.0" });
    renderPanel(
      updateStatus({ updateAvailable: false, latest: null, previousVersionAvailable: true, previousVersion: "1.4.0" }),
    );

    fireEvent.click(await screen.findByRole("button", { name: /Revert to 1.4.0/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Revert" }));

    await waitFor(() => expect(mockUpdates.revert).toHaveBeenCalled());
  });

  it("saves the update settings", async () => {
    const status = updateStatus();
    mockUpdates.saveSettings.mockResolvedValue(status);
    renderPanel(status);

    fireEvent.change(await screen.findByRole("combobox", { name: /Automatic updates/i }), {
      target: { value: "safe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockUpdates.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ autoUpdate: "safe" })),
    );
  });
});

describe("Updates settings route", () => {
  it("resolves the canonical path and the short alias", () => {
    window.history.replaceState({}, "", "/settings/system-info/updates");
    expect(readSettingsTabFromUrl()).toBe("system-info-updates");

    window.history.replaceState({}, "", "/settings/updates");
    expect(readSettingsTabFromUrl()).toBe("system-info-updates");
  });

  it("extracts the problem detail from API errors", () => {
    expect(
      describeUpdateError(new Error('API Error 429: {"title":"Checked recently","detail":"Wait 42 seconds."}')),
    ).toBe("Wait 42 seconds.");
    expect(describeUpdateError(new Error("Network down"))).toBe("Network down");
  });
});

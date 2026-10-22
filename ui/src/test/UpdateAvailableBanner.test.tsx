import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateAvailableBanner } from "../components/UpdateAvailableBanner";
import { updateStatus } from "./updateStatusFixture";

const { mockUseAuth, mockUpdates } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUpdates: { status: vi.fn() },
}));

vi.mock("../auth/AuthContext", () => ({ useAuth: mockUseAuth }));
vi.mock("../api/client", () => ({ updates: mockUpdates }));

function renderBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UpdateAvailableBanner />
    </QueryClientProvider>,
  );
}

describe("UpdateAvailableBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    mockUseAuth.mockReturnValue({ hasPermission: (key: string) => key === "system.update" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows an available update to users who can install it and links to the Updates tab", async () => {
    mockUpdates.status.mockResolvedValue(updateStatus());

    renderBanner();

    expect(await screen.findByText("Cove 1.5.0 is available")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "View update" }));
    expect(window.location.pathname).toBe("/settings/system-info/updates");
  });

  it("does not ask for the status without the update permission", () => {
    mockUseAuth.mockReturnValue({ hasPermission: () => false });

    renderBanner();

    expect(mockUpdates.status).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("stays hidden when the server-wide banner setting is off", async () => {
    mockUpdates.status.mockResolvedValue(updateStatus({ showBanner: false }));

    renderBanner();

    await waitFor(() => expect(mockUpdates.status).toHaveBeenCalled());
    expect(screen.queryByText(/is available/)).not.toBeInTheDocument();
  });

  it("stays dismissed for that version but shows the next one", async () => {
    mockUpdates.status.mockResolvedValue(updateStatus());
    const { unmount } = renderBanner();
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss update notice" }));
    expect(screen.queryByText("Cove 1.5.0 is available")).not.toBeInTheDocument();
    expect(localStorage.getItem("cove.update.dismissed.1.5.0")).toBe("1");
    unmount();

    renderBanner();
    await waitFor(() => expect(mockUpdates.status).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Cove 1.5.0 is available")).not.toBeInTheDocument();

    mockUpdates.status.mockResolvedValue(updateStatus({ latest: { version: "1.5.1" } }));
    renderBanner();
    expect(await screen.findByText("Cove 1.5.1 is available")).toBeInTheDocument();
  });

  it("reports a rolled-back update even when the banner setting is off", async () => {
    mockUpdates.status.mockResolvedValue(
      updateStatus({
        updateAvailable: false,
        latest: null,
        showBanner: false,
        applyState: "rolledBack",
        failedVersion: "1.5.0",
      }),
    );

    renderBanner();

    expect(await screen.findByRole("alert")).toHaveTextContent("Update to 1.5.0 failed and was rolled back");
  });
});

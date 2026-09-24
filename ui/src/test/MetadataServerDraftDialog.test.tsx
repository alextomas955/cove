import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataServerDraftDialog } from "../components/MetadataServerDraftDialog";

const servers = [
  { name: "First provider", endpoint: "https://first.example/graphql" },
  { name: "Second provider", endpoint: "https://second.example/graphql" },
];

function fakeTab() {
  return {
    closed: false,
    opener: {} as unknown,
    close: vi.fn(),
    location: { replace: vi.fn() },
    document: { title: "", body: { textContent: "" } },
  };
}

function renderDialog(submit: (endpoint: string) => Promise<{ draftId: string | null }>, metadataServers = servers) {
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MetadataServerDraftDialog
        onClose={onClose}
        entityLabel="video"
        metadataServers={metadataServers}
        submit={submit}
      />
    </QueryClientProvider>,
  );
  return { onClose };
}

describe("MetadataServerDraftDialog", () => {
  let tab: ReturnType<typeof fakeTab>;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tab = fakeTab();
    openSpy = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it("submits to the chosen server, opens the draft in the pre-opened tab, and links to it", async () => {
    const submit = vi.fn().mockResolvedValue({ draftId: "draft-1" });
    renderDialog(submit);

    await userEvent.selectOptions(screen.getByLabelText("Metadata server"), "https://second.example/graphql");
    await userEvent.click(screen.getByRole("button", { name: "Submit draft" }));

    // The tab is opened within the click so the browser does not treat it as an unrequested popup.
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(tab.opener).toBeNull();
    expect(await screen.findByRole("link", { name: "Open draft" })).toHaveAttribute(
      "href",
      "https://second.example/drafts/draft-1",
    );
    expect(submit).toHaveBeenCalledWith("https://second.example/graphql");
    expect(tab.location.replace).toHaveBeenCalledWith("https://second.example/drafts/draft-1");
    expect(tab.close).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("The video draft was submitted to Second provider.");
    expect(screen.queryByRole("button", { name: "Submit draft" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("closes the pre-opened tab and shows the reason when the submission fails", async () => {
    renderDialog(vi.fn().mockRejectedValue(new Error("Draft rejected by server")));

    await userEvent.click(screen.getByRole("button", { name: "Submit draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Draft rejected by server");
    expect(tab.close).toHaveBeenCalledOnce();
    expect(tab.location.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Submit draft" })).toBeEnabled();
    // Focus returns to the dialog for a retry instead of being stranded on the page behind it.
    expect(screen.getByRole("button", { name: "Submit draft" })).toHaveFocus();
  });

  it("opens no tab and reports the ID when the endpoint has no draft page", async () => {
    renderDialog(vi.fn().mockResolvedValue({ draftId: "draft-2" }), [
      { name: "Custom", endpoint: "https://custom.example/api" },
    ]);

    expect(screen.getByText("Custom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Submit draft" }));

    expect(await screen.findByRole("status")).toHaveTextContent("draft-2");
    expect(openSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("The video draft was submitted to Custom (draft-2).");
    expect(screen.queryByRole("link", { name: "Open draft" })).not.toBeInTheDocument();
  });

  it("still reports the draft link when the browser blocks the new tab", async () => {
    openSpy.mockReturnValue(null);
    renderDialog(vi.fn().mockResolvedValue({ draftId: "draft-3" }));

    await userEvent.click(screen.getByRole("button", { name: "Submit draft" }));

    expect(await screen.findByRole("link", { name: "Open draft" })).toHaveAttribute(
      "href",
      "https://first.example/drafts/draft-3",
    );
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioTagger } from "../components/StudioTagger";
import type { MetadataServerStudioMatch, Studio } from "../api/types";

const mocks = vi.hoisted(() => ({
  searchMetadataServer: vi.fn(),
  findMetadataServerByIds: vi.fn(),
  importFromMetadataServer: vi.fn(),
  metadataServers: [{ endpoint: "https://stash.example/graphql", name: "StashDB" }],
}));

vi.mock("../api/client", () => ({
  studios: {
    searchMetadataServer: mocks.searchMetadataServer,
    findMetadataServerByIds: mocks.findMetadataServerByIds,
    importFromMetadataServer: mocks.importFromMetadataServer,
  },
}));

vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: { scraping: { metadataServers: mocks.metadataServers } } }),
}));

const studio: Studio = {
  id: 21,
  name: "Local Studio",
  favorite: false,
  organized: false,
  urls: ["https://kept.example"],
  aliases: [],
  tags: [],
  remoteIds: [],
  performerCount: 0,
  childStudioCount: 0,
  videoCount: 0,
  imageCount: 0,
  galleryCount: 0,
  groupCount: 0,
  audioCount: 0,
  textCount: 0,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
};

const match = (overrides: Partial<MetadataServerStudioMatch> = {}): MetadataServerStudioMatch => ({
  endpoint: "https://stash.example/graphql",
  serverName: "StashDB",
  id: "remote-studio",
  name: "Remote Studio",
  imageUrl: "https://cdn.example/logo.jpg",
  aliases: ["Remote Alias"],
  urls: ["https://remote.example"],
  parentName: "Remote Parent",
  ...overrides,
});

function renderTagger() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StudioTagger studios={[studio]} mode="detail" />
    </QueryClientProvider>,
  );
}

async function search(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /^Search$/i }));
  return screen.findByRole("button", { name: /^Apply/ });
}

describe("StudioTagger", () => {
  beforeEach(() => {
    mocks.searchMetadataServer.mockResolvedValue([match()]);
    mocks.importFromMetadataServer.mockResolvedValue({});
  });

  it("reviews the selected match as a list of facts with the logo and a counted apply button", async () => {
    const user = userEvent.setup();
    renderTagger();
    await search(user);

    expect(await screen.findByAltText("Logo from StashDB")).toBeInTheDocument();
    // Name and parent change, the logo fills an empty field, and both lists gain an entry.
    expect(await screen.findByRole("button", { name: /^Apply 5 changes$/ })).toBeInTheDocument();
    expect(screen.getByText("Aliases")).toBeInTheDocument();
  });

  it("offers the full side-by-side rows behind Adjust", async () => {
    const user = userEvent.setup();
    renderTagger();
    await search(user);

    const adjust = await screen.findByRole("button", { name: "Adjust…" });
    expect(adjust).toHaveAttribute("aria-expanded", "false");
    await user.click(adjust);

    expect(await screen.findByText(/Empty fields are filled from the StashDB/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done adjusting" }));
    expect(screen.queryByText(/Empty fields are filled from the StashDB/)).not.toBeInTheDocument();
  });

  it("does not offer a choice of match when the source returned only one", async () => {
    const user = userEvent.setup();
    renderTagger();
    await search(user);

    expect(screen.queryByRole("button", { name: "Use Remote Studio" })).not.toBeInTheDocument();
    // With nothing to choose between, the row shows no selector at all, not a dot that selects nothing.
    expect(document.querySelectorAll(".rounded-full.border-2")).toHaveLength(0);
  });

  it("names the source in the expanded header instead of repeating what the rows say", async () => {
    const user = userEvent.setup();
    renderTagger();
    await search(user);

    // The name also appears as the Name row's incoming value; the first is the header.
    const header = screen.getAllByText("Remote Studio")[0].closest("div")!;
    expect(header).toHaveTextContent("StashDB");
    expect(header).not.toHaveTextContent("Remote Parent");
  });

  it("lets another match be chosen when the source returned several", async () => {
    const user = userEvent.setup();
    mocks.searchMetadataServer.mockResolvedValue([match(), match({ id: "other", name: "Other Studio" })]);
    renderTagger();
    await search(user);

    await user.click(await screen.findByRole("button", { name: "Use Other Studio" }));

    expect(await screen.findByRole("button", { name: /^Apply/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use Other Studio" })).not.toBeInTheDocument();
  });

  it("keeps a field the person declines out of the import request", async () => {
    const user = userEvent.setup();
    renderTagger();
    await search(user);

    await user.click(await screen.findByRole("button", { name: "Name: keep current instead" }));
    await user.click(screen.getByRole("button", { name: /^Apply/ }));

    await waitFor(() =>
      expect(mocks.importFromMetadataServer).toHaveBeenCalledWith(
        21,
        expect.objectContaining({
          studioId: "remote-studio",
          fieldStrategies: expect.objectContaining({ name: "ignore" }),
        }),
      ),
    );
  });
});

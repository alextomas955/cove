import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Studio } from "../api/types";
import { StudioEditModal } from "../pages/StudioEditModal";

const mocks = vi.hoisted(() => ({
  studiosUpdate: vi.fn(),
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    studios: { ...actual.studios, update: mocks.studiosUpdate },
  };
});

vi.mock("../components/EntityReferenceSelector", () => ({
  EntityReferenceSelector: ({ onChange }: { onChange: (value: number | undefined) => void }) => (
    <button onClick={() => onChange(undefined)}>Clear parent</button>
  ),
  EntityReferenceMultiSelector: () => <div>Tag selector</div>,
}));

vi.mock("../components/shared", () => ({
  CustomFieldsEditor: () => <div>Custom Fields Editor</div>,
  buildTagProvenanceById: () => ({}),
}));

vi.mock("../components/RemoteIdsEditor", () => ({
  RemoteIdsEditor: () => <div>Remote IDs Editor</div>,
  normalizeRemoteIds: (values: unknown[]) => values,
}));

const studio = {
  id: 6,
  name: "Original Studio",
  details: "About the studio.",
  parentId: 2,
  urls: ["https://example.com/studio"],
  aliases: ["Alias"],
  tags: [{ id: 4, name: "Kept" }],
  remoteIds: [],
  customFields: { region: "EU" },
} as unknown as Studio;

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <StudioEditModal studio={studio} open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("StudioEditModal", () => {
  beforeEach(() => {
    mocks.studiosUpdate.mockReset().mockResolvedValue({});
  });

  it("sends only the fields the user changed", async () => {
    renderModal();

    fireEvent.change(screen.getByPlaceholderText("Studio name"), { target: { value: "Renamed Studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.studiosUpdate).toHaveBeenCalledWith(6, { name: "Renamed Studio" }));
  });

  it("clears only the fields the user blanked", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Clear parent" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mocks.studiosUpdate).toHaveBeenCalledWith(6, { parentId: undefined, clearFields: ["parentId"] }),
    );
  });
});

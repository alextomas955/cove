import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GalleryEditModal } from "../pages/GalleryEditModal";

const { mockGalleries } = vi.hoisted(() => ({
  mockGalleries: {
    update: vi.fn(),
  },
}));

vi.mock("../api/client", () => ({
  galleries: mockGalleries,
}));

vi.mock("../components/StudioSelector", () => ({
  StudioSelector: ({ onChange }: { onChange: (value: number | undefined) => void }) => (
    <div>
      Studio Selector
      <button onClick={() => onChange(undefined)}>Clear studio</button>
    </div>
  ),
}));

vi.mock("../components/EntityReferenceSelector", () => ({
  EntityReferenceMultiSelector: ({
    entityType,
    values,
    onChange,
  }: {
    entityType: string;
    values: number[];
    onChange: (values: number[]) => void;
  }) => (
    <div>
      {entityType} selector: {values.join(",")}
      {entityType === "video" ? (
        <>
          <button onClick={() => onChange([...values, 22])}>Add video 22</button>
          <button onClick={() => onChange(values.filter((id) => id !== 14))}>Remove video 14</button>
        </>
      ) : null}
    </div>
  ),
}));

vi.mock("../components/shared", () => ({
  buildTagProvenanceById: () => new Map(),
  CustomFieldsEditor: () => <div>Custom Fields Editor</div>,
}));

vi.mock("../components/StringListEditor", () => ({
  StringListEditor: () => <div>String List Editor</div>,
}));

function buildGallery(overrides: Record<string, unknown> = {}) {
  return {
    id: 21,
    title: "Summer Set",
    code: "SUM-21",
    date: "2026-05-01",
    details: "A bright summer gallery.",
    photographer: "Riley Smith",
    organized: true,
    studioId: 9,
    urls: ["https://example.com/gallery/21"],
    tags: [{ id: 8, name: "Beach" }],
    performers: [{ id: 5, name: "Alex" }],
    videoIds: [14],
    customFields: {},
    ...overrides,
  } as any;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderModal() {
  const queryClient = createQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <GalleryEditModal open onClose={vi.fn()} gallery={buildGallery()} />
    </QueryClientProvider>,
  );

  return queryClient;
}

describe("GalleryEditModal", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("omits rating and organized while using an ISO date field", async () => {
    mockGalleries.update.mockResolvedValue({});

    renderModal();

    expect(screen.queryByText("Rating")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    const dateInput = screen.getByDisplayValue("2026-05-01");
    expect(dateInput).toHaveAttribute("type", "text");
    expect(dateInput).toHaveAttribute("placeholder", "yyyy-MM-dd");

    fireEvent.change(dateInput, { target: { value: "2026-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockGalleries.update).toHaveBeenCalledTimes(1));

    const [galleryId, payload] = mockGalleries.update.mock.calls[0];
    expect(galleryId).toBe(21);
    expect(payload).toEqual({ date: "2026-06" });
  });

  it("sends only the fields the user changed", async () => {
    mockGalleries.update.mockResolvedValue({});

    renderModal();

    fireEvent.change(screen.getByDisplayValue("Summer Set"), { target: { value: "Renamed Set" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockGalleries.update).toHaveBeenCalledTimes(1));
    // Untouched relations are omitted so a stale copy cannot revert links changed elsewhere.
    expect(mockGalleries.update.mock.calls[0][1]).toEqual({ title: "Renamed Set" });
  });

  it("adds video relationships and refreshes the gallery videos", async () => {
    mockGalleries.update.mockResolvedValue({});

    const queryClient = renderModal();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    expect(screen.getByText("Videos")).toBeInTheDocument();
    expect(screen.getByText("video selector: 14")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add video 22" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockGalleries.update).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["gallery-videos", 21] }));

    expect(mockGalleries.update.mock.calls[0][1]).toHaveProperty("videoIds", [14, 22]);
    // Refresh the videos whose gallery links changed so their editors do not resave the old links.
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["video", 22] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["video", 14] });
  });

  it("removes existing video relationships", async () => {
    mockGalleries.update.mockResolvedValue({});

    const queryClient = renderModal();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    fireEvent.click(screen.getByRole("button", { name: "Remove video 14" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockGalleries.update).toHaveBeenCalledTimes(1));

    expect(mockGalleries.update.mock.calls[0][1]).toHaveProperty("videoIds", []);
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["video", 14] }));
  });

  it("marks a cleared date and studio for removal", async () => {
    mockGalleries.update.mockResolvedValue({});

    renderModal();

    fireEvent.change(screen.getByDisplayValue("2026-05-01"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear studio" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockGalleries.update).toHaveBeenCalledTimes(1));
    expect(mockGalleries.update.mock.calls[0][1]).toEqual({
      date: undefined,
      studioId: undefined,
      clearFields: ["date", "studioId"],
    });
  });

  it("starts from the latest gallery each time it opens", async () => {
    mockGalleries.update.mockResolvedValue({});
    const queryClient = createQueryClient();
    const renderWith = (gallery: unknown, open: boolean) => (
      <QueryClientProvider client={queryClient}>
        <GalleryEditModal open={open} onClose={vi.fn()} gallery={gallery as any} />
      </QueryClientProvider>
    );

    // The detail page keeps the closed modal mounted while the gallery refetches, for example after
    // a video was linked to it from the video's own editor.
    const { rerender } = render(renderWith(buildGallery({ videoIds: [] }), false));
    rerender(renderWith(buildGallery({ videoIds: [30] }), false));
    rerender(renderWith(buildGallery({ videoIds: [30] }), true));

    expect(screen.getByText("video selector: 30")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Summer Set"), { target: { value: "Renamed Set" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockGalleries.update).toHaveBeenCalledTimes(1));
    expect(mockGalleries.update.mock.calls[0][1]).toEqual({ title: "Renamed Set" });
  });

  it("keeps unsaved edits when the gallery refetches while open", () => {
    const queryClient = createQueryClient();
    const renderWith = (gallery: unknown) => (
      <QueryClientProvider client={queryClient}>
        <GalleryEditModal open onClose={vi.fn()} gallery={gallery as any} />
      </QueryClientProvider>
    );

    const { rerender } = render(renderWith(buildGallery()));
    fireEvent.change(screen.getByDisplayValue("Summer Set"), { target: { value: "Renamed Set" } });
    rerender(renderWith(buildGallery()));

    expect(screen.getByDisplayValue("Renamed Set")).toBeInTheDocument();
  });

  it("does not resave links that changed after the edit started", async () => {
    mockGalleries.update.mockResolvedValue({});
    const queryClient = createQueryClient();
    const renderWith = (gallery: unknown) => (
      <QueryClientProvider client={queryClient}>
        <GalleryEditModal open onClose={vi.fn()} gallery={gallery as any} />
      </QueryClientProvider>
    );

    const { rerender } = render(renderWith(buildGallery({ videoIds: [] })));
    fireEvent.change(screen.getByDisplayValue("Summer Set"), { target: { value: "Renamed Set" } });
    rerender(renderWith(buildGallery({ videoIds: [30] })));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockGalleries.update).toHaveBeenCalledTimes(1));
    expect(mockGalleries.update.mock.calls[0][1]).toEqual({ title: "Renamed Set" });
  });

  it("refreshes videos whose links changed elsewhere and were restored by the save", async () => {
    mockGalleries.update.mockResolvedValue({});
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const renderWith = (gallery: unknown) => (
      <QueryClientProvider client={queryClient}>
        <GalleryEditModal open onClose={vi.fn()} gallery={gallery as any} />
      </QueryClientProvider>
    );

    // Video 14 is unlinked elsewhere while the edit is open; the saved list still contains it.
    const { rerender } = render(renderWith(buildGallery({ videoIds: [14] })));
    rerender(renderWith(buildGallery({ videoIds: [] })));
    fireEvent.click(screen.getByRole("button", { name: "Add video 22" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockGalleries.update).toHaveBeenCalledWith(21, { videoIds: [14, 22] }));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["video", 14] }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["video", 22] });
  });
});

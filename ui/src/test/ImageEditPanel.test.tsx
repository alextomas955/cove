import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Image } from "../api/types";
import { ImageEditPanel } from "../pages/ImageEditModal";

const mocks = vi.hoisted(() => ({
  imagesUpdate: vi.fn(),
  imagesGet: vi.fn(),
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    images: { ...actual.images, update: mocks.imagesUpdate, get: mocks.imagesGet },
  };
});

vi.mock("../components/EntityReferenceSelector", () => ({
  EntityReferenceSelector: () => <div>Reference selector</div>,
  EntityReferenceMultiSelector: ({ entityType }: { entityType: string }) => <div>{entityType} selector</div>,
  EntityReferenceValue: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock("../components/StudioSelector", () => ({
  StudioSelector: () => <div>Studio Selector</div>,
}));

vi.mock("../components/shared", () => ({
  CustomFieldsEditor: () => <div>Custom Fields Editor</div>,
  buildTagProvenanceById: () => ({}),
}));

const image = {
  id: 12,
  title: "Sunset Poster",
  code: "IMG-12",
  details: "A beach sunset still.",
  photographer: "Riley Smith",
  date: "2026-05-01",
  studioId: 9,
  urls: ["https://example.com/image/12"],
  tags: [{ id: 6, name: "Beach" }],
  performers: [{ id: 3, name: "Alex" }],
  galleryIds: [4],
  groups: [{ id: 5, name: "Series", videoIndex: 0 }],
  contextTagApplications: [],
  customFields: { mood: "warm" },
} as unknown as Image;

describe("ImageEditPanel", () => {
  beforeEach(() => {
    mocks.imagesUpdate.mockReset().mockResolvedValue(undefined);
    mocks.imagesGet.mockReset().mockResolvedValue(image);
  });

  it("sends only the fields the user changed", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ImageEditPanel image={image} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByDisplayValue("Sunset Poster"), { target: { value: "Renamed Poster" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.imagesUpdate).toHaveBeenCalledWith(12, { title: "Renamed Poster" }));
  });

  it("keeps the user's edits when saving fails", async () => {
    mocks.imagesUpdate.mockRejectedValue(new Error("Validation failed"));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ImageEditPanel image={image} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByDisplayValue("Sunset Poster"), { target: { value: "Unsaved draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.imagesUpdate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Validation failed/)).toBeInTheDocument());
    expect(screen.getByDisplayValue("Unsaved draft")).toBeInTheDocument();
  });

  it("keeps unsaved edits and follows other changes when the image refetches", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const renderWith = (current: Image) => (
      <QueryClientProvider client={queryClient}>
        <ImageEditPanel image={current} />
      </QueryClientProvider>
    );

    const { rerender } = render(renderWith(image));
    fireEvent.change(screen.getByDisplayValue("Sunset Poster"), { target: { value: "Unsaved draft" } });
    rerender(renderWith({ ...image, organized: true, photographer: "Scraped photographer" } as Image));

    expect(screen.getByDisplayValue("Unsaved draft")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Scraped photographer")).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Segment } from "../api/types";
import { videos } from "../api/client";
import { VideoSegmentsPanel } from "../components/VideoSegmentsPanel";
import { EMPTY_SEGMENT_FILTER } from "../components/segmentFilter";

vi.mock("../api/client", () => ({
  videos: { segments: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
  tagGroups: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock("../components/EntityReferenceSelector", () => ({
  EntityReferenceSelector: () => null,
  EntityReferenceMultiSelector: () => null,
}));

vi.mock("../components/AddToGroupDialog", () => ({ AddToGroupDialog: () => null }));

type PanelProps = ComponentProps<typeof VideoSegmentsPanel>;

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props: PanelProps = {
    videoId: 7,
    spans: [],
    rawSegments: [],
    loading: false,
    profiles: [],
    onProfileChange: vi.fn(),
    filter: EMPTY_SEGMENT_FILTER,
    onFilterChange: vi.fn(),
    tagIdToGroupId: new Map(),
    canEdit: true,
    onNavigate: vi.fn(),
    ...overrides,
  };
  const view = (next: Partial<PanelProps>) => (
    <QueryClientProvider client={queryClient}>
      <VideoSegmentsPanel {...props} {...next} />
    </QueryClientProvider>
  );
  const result = render(view({}));
  return { ...result, rerenderPanel: (next: Partial<PanelProps>) => result.rerender(view(next)) };
}

const startInput = () => screen.getByPlaceholderText("0:00") as HTMLInputElement;

describe("VideoSegmentsPanel add at current time", () => {
  it("pre-fills the start of a new segment with the current playback time", () => {
    renderPanel({ currentTime: 83.4 });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(startInput().value).toBe("1:23.4");
    expect((screen.getByPlaceholderText("Optional") as HTMLInputElement).value).toBe("");
  });

  it("uses the playback time at the moment Add is clicked, not a previous one", () => {
    const { rerenderPanel } = renderPanel({ currentTime: 10 });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);

    rerenderPanel({ currentTime: 3725.2 });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(startInput().value).toBe("1:02:05.2");
  });

  it("opens the add form at the current time when the parent requests it, then reports it handled", () => {
    const onAddRequestHandled = vi.fn();
    renderPanel({ currentTime: 83.4, addRequested: true, onAddRequestHandled });

    expect(startInput().value).toBe("1:23.4");
    expect(onAddRequestHandled).toHaveBeenCalled();
  });

  it("handles a request that arrives while the panel is already mounted", () => {
    const onAddRequestHandled = vi.fn();
    const { rerenderPanel } = renderPanel({ currentTime: 5, onAddRequestHandled });
    expect(screen.queryByPlaceholderText("0:00")).not.toBeInTheDocument();

    rerenderPanel({ currentTime: 42, addRequested: true });

    expect(startInput().value).toBe("0:42");
    expect(onAddRequestHandled).toHaveBeenCalledTimes(1);
  });

  it("does not replace an edit in progress when a request arrives", () => {
    const segment = { id: 3, kind: "tag", startSec: 12, endSec: 20, tagId: 9, title: "Intro" } as Segment;
    const span = { spanKey: "s3", startSec: 12, endSec: 20, segmentIds: [3] } as PanelProps["spans"][number];
    const { rerenderPanel } = renderPanel({ currentTime: 99, rawSegments: [segment], spans: [span] });
    fireEvent.click(screen.getByTitle("Edit segment"));
    expect(startInput().value).toBe("0:12");

    rerenderPanel({ currentTime: 99, rawSegments: [segment], spans: [span], addRequested: true });

    expect(startInput().value).toBe("0:12");
  });

  it("ignores requests when the user cannot edit segments", () => {
    renderPanel({ currentTime: 83.4, canEdit: false, addRequested: true, onAddRequestHandled: vi.fn() });

    expect(screen.queryByPlaceholderText("0:00")).not.toBeInTheDocument();
  });

  it("shows stored times to the hundredth and saves them unchanged when only the title is edited", async () => {
    vi.mocked(videos.segments.update).mockResolvedValue({} as Segment);
    const segment = { id: 3, kind: "tag", startSec: 1734.025, endSec: 1754.458, tagId: 9, title: "Intro" } as Segment;
    const span = {
      spanKey: "s3",
      startSec: 1734.025,
      endSec: 1754.458,
      segmentIds: [3],
    } as PanelProps["spans"][number];
    renderPanel({ rawSegments: [segment], spans: [span] });
    fireEvent.click(screen.getByTitle("Edit segment"));

    expect(startInput().value).toBe("28:54.03");
    expect((screen.getByPlaceholderText("Optional") as HTMLInputElement).value).toBe("29:14.46");

    fireEvent.change(screen.getByDisplayValue("Intro"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(videos.segments.update).toHaveBeenCalledWith(
        7,
        3,
        expect.objectContaining({ title: "Renamed", startSec: 1734.025, endSec: 1754.458 }),
      );
    });
  });

  it("does not save while the end time cannot be parsed", () => {
    const segment = { id: 3, kind: "tag", startSec: 12, endSec: 20, tagId: 9, title: "Intro" } as Segment;
    const span = { spanKey: "s3", startSec: 12, endSec: 20, segmentIds: [3] } as PanelProps["spans"][number];
    renderPanel({ rawSegments: [segment], spans: [span] });
    fireEvent.click(screen.getByTitle("Edit segment"));

    fireEvent.change(screen.getByPlaceholderText("Optional"), { target: { value: "0:2x" } });

    expect(screen.getByRole("button", { name: "Update" })).toBeDisabled();
  });
});

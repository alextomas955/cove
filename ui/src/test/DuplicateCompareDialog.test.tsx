import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Video } from "../api/types";
import { DuplicateCompareDialog } from "../components/duplicates/DuplicateCompareDialog";
import { clampView, detailShown, nativeZoom, zoomAround } from "../components/duplicates/compareView";
import { toReviewGroup } from "../components/duplicates/duplicateModel";

vi.mock("../api/client", () => ({
  videos: {
    streamUrl: (id: number, fileId?: number) => `/stream/${id}?file=${fileId}`,
    transcodeUrl: (id: number) => `/transcode/${id}`,
    screenshotUrl: (id: number) => `/screenshot/${id}`,
  },
}));

function video(id: number, width: number, height: number): Video {
  return {
    id,
    title: `Candidate ${id}`,
    organized: false,
    urls: [],
    tags: [],
    performers: [],
    files: [
      {
        id: id * 10,
        path: `/library/candidate-${id}.mp4`,
        basename: `candidate-${id}.mp4`,
        format: "mp4",
        width,
        height,
        duration: 120,
        videoCodec: "h264",
        audioCodec: "aac",
        frameRate: 30,
        bitRate: 8_000_000,
        size: 120_000_000,
        fingerprints: [],
      },
    ],
    primaryFileId: id * 10,
    groups: [],
    galleries: [],
    remoteIds: [],
    createdAt: "2026-08-25T00:00:00Z",
    updatedAt: "2026-08-25T00:00:00Z",
  };
}

const uhd = video(1, 3840, 2160);
const fullHd = video(2, 1920, 1080);
const stage = { width: 1280, height: 720 };

describe("compare view geometry", () => {
  it("reports how much of each copy's resolution a fitted stage shows", () => {
    expect(detailShown({ width: 3840, height: 2160 }, stage, 1, 1)).toBeCloseTo(1 / 3);
    expect(detailShown({ width: 1920, height: 1080 }, stage, 1, 1)).toBeCloseTo(2 / 3);
    expect(detailShown({ width: 3840, height: 2160 }, stage, 1, 2)).toBeCloseTo(2 / 3);
    expect(detailShown(undefined, stage, 1, 1)).toBeUndefined();
  });

  it("zooms 1:1 to the sharper copy, never below fit", () => {
    expect(
      nativeZoom(
        [
          { width: 3840, height: 2160 },
          { width: 1920, height: 1080 },
        ],
        stage,
        1,
      ),
    ).toBeCloseTo(3);
    expect(nativeZoom([{ width: 640, height: 360 }], stage, 1)).toBe(1);
  });

  it("keeps the picture covering the stage while panning", () => {
    expect(clampView({ zoom: 2, x: 5000, y: -5000 }, stage)).toEqual({ zoom: 2, x: 640, y: -360 });
    expect(clampView({ zoom: 0.5, x: 10, y: 10 }, stage)).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it("keeps the point under the cursor in place when zooming", () => {
    const point = { x: 200, y: -100 };
    const zoomed = zoomAround({ zoom: 1, x: 0, y: 0 }, 2, point, stage);
    // The source point under the cursor before zooming sits at (point - pan) / zoom; it must be unchanged.
    expect((point.x - zoomed.x) / zoomed.zoom).toBeCloseTo(point.x);
    expect((point.y - zoomed.y) / zoomed.zoom).toBeCloseTo(point.y);
  });
});

describe("DuplicateCompareDialog", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: stage.width,
      bottom: stage.height,
      width: stage.width,
      height: stage.height,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderDialog = (onKeepOnly?: (videoId: number) => void) =>
    render(
      <DuplicateCompareDialog
        open
        videos={[uhd, fullHd]}
        keepVideoIds={new Set([uhd.id])}
        onClose={vi.fn()}
        onKeepOnly={onKeepOnly}
      />,
    );

  it("shows that a fitted 4K copy is shrunk and zooms both copies together to reveal full detail", () => {
    renderDialog();
    const detail = screen.getByTestId("detail-shown");
    expect(detail).toHaveTextContent("A 33% · B 67%");

    fireEvent.click(screen.getByRole("button", { name: "1:1" }));
    expect(detail).toHaveTextContent("A full · B full");
    const layers = Array.from(document.querySelectorAll("video")).map((element) => element.parentElement!);
    expect(layers).toHaveLength(2);
    for (const layer of layers) expect(layer.style.width).toBe("300%");

    fireEvent.click(screen.getByRole("button", { name: "2×" }));
    expect(detail).toHaveTextContent("A 67% · B full");

    fireEvent.click(screen.getByRole("button", { name: "Fit" }));
    expect(detail).toHaveTextContent("A 33% · B 67%");
    for (const layer of layers) expect(layer.style.width).toBe("100%");
  });

  it("pans both copies together when dragging a zoomed picture", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "2×" }));
    const stageElement = screen.getByTestId("compare-stage");
    // Far from the divider (which sits at 50%), so the drag pans instead of moving the divider.
    fireEvent.pointerDown(stageElement, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(stageElement, { clientX: 160, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(stageElement, { pointerId: 1 });

    const layers = Array.from(document.querySelectorAll("video")).map((element) => element.parentElement!);
    for (const layer of layers) {
      expect(layer.style.left).toContain("+ 60px");
      expect(layer.style.top).toContain("+ 30px");
    }
  });

  it("lets the reviewer keep just one copy from the comparison", () => {
    const onKeepOnly = vi.fn();
    renderDialog(onKeepOnly);

    expect(screen.getByRole("button", { name: /Keeping A/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Keep only B" }));
    expect(onKeepOnly).toHaveBeenCalledWith(fullHd.id);
  });

  it("compares two files of one video by file, without the primary-file-only frame strips", () => {
    const onKeepOnly = vi.fn();
    const twoFiles: Video = {
      ...fullHd,
      files: [
        { ...fullHd.files[0], id: 21, basename: "scene-1080p.mp4" },
        { ...fullHd.files[0], id: 22, basename: "scene-2160p.mp4", width: 3840, height: 2160 },
      ],
      primaryFileId: 21,
    };
    const copies = toReviewGroup({
      id: 1,
      position: 0,
      status: "unresolved",
      videos: [twoFiles],
      keepVideoIds: [],
      fileIds: [21, 22],
      keepFileIds: [21],
      deleteFiles: false,
      removedVideoCount: 0,
      removedBytes: 0,
      reclaimableBytes: 0,
    }).videos;
    render(
      <DuplicateCompareDialog
        open
        videos={copies}
        keepVideoIds={new Set([21])}
        onClose={vi.fn()}
        onKeepOnly={onKeepOnly}
      />,
    );

    expect(screen.queryByRole("tab", { name: /Frames/ })).not.toBeInTheDocument();
    expect(screen.getByText("scene-1080p.mp4")).toBeInTheDocument();
    expect(screen.getByText("scene-2160p.mp4")).toBeInTheDocument();
    expect(screen.getByTestId("detail-shown")).toHaveTextContent("A 67% · B 33%");
    const sources = Array.from(document.querySelectorAll("video")).map((element) => element.getAttribute("src"));
    expect(sources).toEqual(["/stream/2?file=21", "/stream/2?file=22"]);

    fireEvent.click(screen.getByRole("button", { name: "Keep only B" }));
    expect(onKeepOnly).toHaveBeenCalledWith(22);
  });

  it("offers no keep buttons when the group can no longer change", () => {
    renderDialog();
    expect(screen.queryByRole("button", { name: /Keep only/ })).not.toBeInTheDocument();
  });
});

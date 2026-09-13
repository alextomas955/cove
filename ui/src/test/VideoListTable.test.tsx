import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Video, VideoListEntry } from "../api/types";
import { ListPageCardSizeContext } from "../components/ListPageCardSizeContext";
import { getVideoListThumbnailHeightPx, VideoListTable } from "../components/VideoListTable";
import { DEFAULT_VIDEO_LIST_COLUMN_IDS } from "../components/videoListColumns";

vi.mock("../components/Rating", () => ({
  RatingBadge: ({ rating }: { rating?: number }) => <span>{rating}</span>,
}));

function makeVideo(id: number, title: string): Video {
  return {
    id,
    title,
    organized: false,
    urls: [],
    tags: [],
    performers: [],
    files: [],
    groups: [],
    galleries: [],
    remoteIds: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

const entries: VideoListEntry[] = [
  { kind: "video", id: 1, video: makeVideo(1, "First") },
  {
    kind: "compilation",
    id: 9,
    group: { id: 9, name: "Best of", videoCount: 4, studioName: "Studio", date: "2024-01-01" } as never,
  },
  { kind: "video", id: 2, video: makeVideo(2, "Second") },
  { kind: "video", id: 3, video: makeVideo(3, "Third") },
];

describe("VideoListTable", () => {
  it("renders headers and cells in the requested order and ignores unknown ids", () => {
    render(
      <VideoListTable
        entries={entries}
        columnIds={["date", "bogus" as never, "title"]}
        engagementById={new Map()}
        onNavigate={vi.fn()}
      />,
    );
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Date", "Title"]);
    const firstRowCells = [...screen.getByText("First").closest("tr")!.querySelectorAll("td")];
    expect(firstRowCells).toHaveLength(2);
    expect(firstRowCells[1]).toHaveTextContent("First");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("falls back to the default columns when every id is unknown", () => {
    render(
      <VideoListTable
        entries={entries}
        columnIds={["bogus" as never]}
        engagementById={new Map()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("columnheader")).toHaveLength(DEFAULT_VIDEO_LIST_COLUMN_IDS.length);
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(
      <VideoListTable entries={[]} columnIds={["title"]} engagementById={new Map()} onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("exposes the title as a keyboard-focusable control that follows the row action", async () => {
    const onNavigate = vi.fn();
    const onToggle = vi.fn();
    const { rerender } = render(
      <VideoListTable
        entries={entries}
        columnIds={["title"]}
        engagementById={new Map()}
        onNavigate={onNavigate}
        selectedIds={new Set()}
        onToggle={onToggle}
        selecting={false}
      />,
    );
    const title = screen.getByRole("button", { name: "Second" });
    title.focus();
    expect(title).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith({ page: "video", id: 2 });
    expect(onToggle).not.toHaveBeenCalled();

    rerender(
      <VideoListTable
        entries={entries}
        columnIds={["title"]}
        engagementById={new Map()}
        onNavigate={onNavigate}
        selectedIds={new Set([1])}
        onToggle={onToggle}
        selecting
      />,
    );
    onNavigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(onToggle).toHaveBeenCalledWith(2, { range: false, orderedIds: [1, 2, 3] });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("sizes fixed columns and leaves fluid columns to share the rest", () => {
    render(
      <VideoListTable
        entries={entries.slice(0, 1)}
        columnIds={["title", "filename", "date"]}
        engagementById={new Map()}
        onNavigate={vi.fn()}
        selectedIds={new Set()}
        onToggle={vi.fn()}
      />,
    );
    const table = screen.getByRole("table", { name: "Videos" });
    expect(table).toHaveStyle({ tableLayout: "fixed", minWidth: "464px" });
    const [selection, title, filename, date] = screen.getAllByRole("columnheader");
    expect(selection).toHaveStyle({ width: "40px" });
    expect(title.style.width).toBe("");
    expect(filename.style.width).toBe("");
    expect(date).toHaveStyle({ width: "104px" });
  });

  it("navigates on row click and toggles when selecting", () => {
    const onNavigate = vi.fn();
    const onToggle = vi.fn();
    const { rerender } = render(
      <VideoListTable
        entries={entries}
        columnIds={["title"]}
        engagementById={new Map()}
        onNavigate={onNavigate}
        selectedIds={new Set()}
        onToggle={onToggle}
        selecting={false}
      />,
    );
    fireEvent.click(screen.getByText("Second"));
    expect(onNavigate).toHaveBeenCalledWith({ page: "video", id: 2 });

    rerender(
      <VideoListTable
        entries={entries}
        columnIds={["title"]}
        engagementById={new Map()}
        onNavigate={onNavigate}
        selectedIds={new Set([1])}
        onToggle={onToggle}
        selecting
      />,
    );
    onNavigate.mockClear();
    fireEvent.click(screen.getByText("Third"), { shiftKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onToggle).toHaveBeenCalledWith(3, { range: true, orderedIds: [1, 2, 3] });
    expect(screen.getByText("First").closest("tr")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Third").closest("tr")).toHaveAttribute("aria-selected", "false");
  });

  it("toggles from the row checkbox without navigating", () => {
    const onNavigate = vi.fn();
    const onToggle = vi.fn();
    render(
      <VideoListTable
        entries={entries}
        columnIds={["title"]}
        engagementById={new Map()}
        onNavigate={onNavigate}
        selectedIds={new Set()}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select First" }));
    expect(onToggle).toHaveBeenCalledWith(1, { range: false, orderedIds: [1, 2, 3] });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("selects and clears all visible videos from the header checkbox", () => {
    const onSelectVisible = vi.fn();
    const { rerender } = render(
      <VideoListTable
        entries={entries}
        columnIds={["title"]}
        engagementById={new Map()}
        onNavigate={vi.fn()}
        selectedIds={new Set([2])}
        onToggle={vi.fn()}
        onSelectVisible={onSelectVisible}
      />,
    );
    const selectAll = screen.getByRole("checkbox", { name: "Select all visible" }) as HTMLInputElement;
    expect(selectAll.indeterminate).toBe(true);
    expect(selectAll.checked).toBe(false);
    fireEvent.click(selectAll);
    expect(onSelectVisible).toHaveBeenCalledWith([1, 2, 3], true);

    rerender(
      <VideoListTable
        entries={entries}
        columnIds={["title"]}
        engagementById={new Map()}
        onNavigate={vi.fn()}
        selectedIds={new Set([1, 2, 3])}
        onToggle={vi.fn()}
        onSelectVisible={onSelectVisible}
      />,
    );
    expect(selectAll.indeterminate).toBe(false);
    expect(selectAll.checked).toBe(true);
    fireEvent.click(selectAll);
    expect(onSelectVisible).toHaveBeenLastCalledWith([1, 2, 3], false);
  });

  it("renders compilation entries as a spanning row", () => {
    const onNavigate = vi.fn();
    render(
      <VideoListTable
        entries={entries}
        columnIds={["title", "date", "duration"]}
        engagementById={new Map()}
        onNavigate={onNavigate}
        selectedIds={new Set()}
        onToggle={vi.fn()}
      />,
    );
    const cell = screen.getByText("Best of").closest("td");
    expect(cell).toHaveAttribute("colspan", "4");
    fireEvent.click(screen.getByText("Best of"));
    expect(onNavigate).toHaveBeenCalledWith({ page: "compilation", id: 9 });
  });

  it("derives the thumbnail height from the card size zoom", () => {
    expect(getVideoListThumbnailHeightPx(undefined)).toBe(72);
    expect(getVideoListThumbnailHeightPx(0)).toBe(48);
    expect(getVideoListThumbnailHeightPx(10)).toBe(120);
    render(
      <ListPageCardSizeContext.Provider value={{ cardMinWidthPx: 200, zoomLevel: 2 }}>
        <VideoListTable
          entries={entries.slice(0, 1)}
          columnIds={["thumbnail", "title"]}
          engagementById={new Map()}
          onNavigate={vi.fn()}
        />
      </ListPageCardSizeContext.Provider>,
    );
    const image = screen.getByRole("presentation");
    expect(image.parentElement).toHaveStyle({ height: "96px" });
  });
});

function handleFor(id: string) {
  return document.querySelector(`[data-resize-handle="${id}"]`) as HTMLElement;
}

describe("VideoListTable column resizing", () => {
  function renderResizable(onColumnWidthsChange = vi.fn(), columnWidths = {}) {
    render(
      <VideoListTable
        entries={entries.slice(0, 1)}
        columnIds={["title", "date"]}
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
        engagementById={new Map()}
        onNavigate={vi.fn()}
      />,
    );
    return onColumnWidthsChange;
  }

  it("does not render handles without a change handler", () => {
    render(
      <VideoListTable
        entries={entries.slice(0, 1)}
        columnIds={["title"]}
        engagementById={new Map()}
        onNavigate={vi.fn()}
      />,
    );
    expect(document.querySelector("[data-resize-handle]")).toBeNull();
  });

  it("commits a dragged width once on release and shows it live while dragging", () => {
    const onChange = renderResizable();
    const handle = handleFor("date");
    const dateHeader = screen.getByRole("columnheader", { name: /Date/ });
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 560, buttons: 1 });
    expect(dateHeader).toHaveStyle({ width: "164px" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 580 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ date: 184 });
  });

  it("clamps to the minimum width and keeps other user widths", () => {
    const onChange = renderResizable(vi.fn(), { title: 400 });
    const handle = handleFor("date");
    fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientX: 300, buttons: 1 });
    fireEvent.pointerUp(handle, { pointerId: 2, clientX: 100 });
    expect(onChange).toHaveBeenCalledWith({ title: 400, date: 48 });
  });

  it("resets a column on double-click and adds a filler when nothing is fluid", () => {
    const onChange = renderResizable(vi.fn(), { title: 400 });
    expect(screen.getByRole("table")).toHaveStyle({ minWidth: "504px" });
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(document.querySelectorAll("thead th")).toHaveLength(3);
    fireEvent.doubleClick(handleFor("title"));
    expect(onChange).toHaveBeenCalledWith({});
  });
});

describe("VideoListTable resize end conditions", () => {
  function renderResizable(onColumnWidthsChange = vi.fn()) {
    const utils = render(
      <VideoListTable
        entries={entries.slice(0, 1)}
        columnIds={["title", "date"]}
        columnWidths={{}}
        onColumnWidthsChange={onColumnWidthsChange}
        engagementById={new Map()}
        onNavigate={vi.fn()}
      />,
    );
    return { ...utils, onColumnWidthsChange };
  }

  it("does not commit a click without movement", () => {
    const { onColumnWidthsChange } = renderResizable();
    fireEvent.pointerDown(handleFor("date"), { button: 0, pointerId: 1, clientX: 500 });
    fireEvent.pointerUp(handleFor("date"), { pointerId: 1, clientX: 500 });
    expect(onColumnWidthsChange).not.toHaveBeenCalled();
  });

  it("ends the drag when a move arrives without a pressed button", () => {
    const { onColumnWidthsChange } = renderResizable();
    fireEvent.pointerDown(handleFor("date"), { button: 0, pointerId: 1, clientX: 500 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 540, buttons: 1 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 560, buttons: 0 });
    expect(onColumnWidthsChange).toHaveBeenCalledWith({ date: 164 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 700, buttons: 0 });
    expect(onColumnWidthsChange).toHaveBeenCalledTimes(1);
  });

  it("abandons the drag on window blur and on unmount", () => {
    const { onColumnWidthsChange, unmount } = renderResizable();
    fireEvent.pointerDown(handleFor("date"), { button: 0, pointerId: 1, clientX: 500 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 540, buttons: 1 });
    fireEvent.blur(window);
    expect(onColumnWidthsChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 600 });
    expect(onColumnWidthsChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(handleFor("date"), { button: 0, pointerId: 2, clientX: 500 });
    unmount();
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 540, buttons: 1 });
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 600 });
    expect(onColumnWidthsChange).not.toHaveBeenCalled();
  });
});

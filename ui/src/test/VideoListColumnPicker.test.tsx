import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VideoListColumnPicker } from "../components/VideoListColumnPicker";
import { DEFAULT_VIDEO_LIST_COLUMN_IDS } from "../components/videoListColumns";

async function openPicker() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Columns" }));
  return user;
}

describe("VideoListColumnPicker", () => {
  it("opens and closes the dialog", async () => {
    render(<VideoListColumnPicker columnIds={["title"]} onChange={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const user = await openPicker();
    expect(screen.getByRole("dialog", { name: "List columns" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await openPicker();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hides and shows columns", async () => {
    const onChange = vi.fn();
    render(<VideoListColumnPicker columnIds={["title", "date"]} onChange={onChange} />);
    const user = await openPicker();
    await user.click(screen.getByRole("checkbox", { name: "Date" }));
    expect(onChange).toHaveBeenCalledWith(["title"]);
    await user.click(screen.getByRole("checkbox", { name: "Path" }));
    expect(onChange).toHaveBeenCalledWith(["title", "date", "path"]);
  });

  it("keeps the last visible column and the title checked", async () => {
    const { rerender } = render(<VideoListColumnPicker columnIds={["date"]} onChange={vi.fn()} />);
    await openPicker();
    expect(screen.getByRole("checkbox", { name: "Date" })).toBeDisabled();
    rerender(<VideoListColumnPicker columnIds={["title", "date"]} onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Title" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Date" })).toBeEnabled();
  });

  it("reorders visible columns", async () => {
    const onChange = vi.fn();
    render(<VideoListColumnPicker columnIds={["title", "date", "duration"]} onChange={onChange} />);
    const user = await openPicker();
    expect(screen.getByRole("button", { name: "Move Title up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Duration down" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move Date up" }));
    expect(onChange).toHaveBeenCalledWith(["date", "title", "duration"]);
    await user.click(screen.getByRole("button", { name: "Move Date down" }));
    expect(onChange).toHaveBeenCalledWith(["title", "duration", "date"]);
  });

  it("resets to the default columns", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<VideoListColumnPicker columnIds={["title"]} onChange={onChange} />);
    const user = await openPicker();
    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(onChange).toHaveBeenCalledWith([...DEFAULT_VIDEO_LIST_COLUMN_IDS]);
    rerender(<VideoListColumnPicker columnIds={DEFAULT_VIDEO_LIST_COLUMN_IDS} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Reset to defaults" })).toBeDisabled();
  });
});

describe("VideoListColumnPicker widths", () => {
  it("clears user widths together with the column list", async () => {
    const onChange = vi.fn();
    const onColumnWidthsChange = vi.fn();
    render(
      <VideoListColumnPicker
        columnIds={DEFAULT_VIDEO_LIST_COLUMN_IDS}
        onChange={onChange}
        columnWidths={{ title: 300 }}
        onColumnWidthsChange={onColumnWidthsChange}
      />,
    );
    const user = await openPicker();
    const reset = screen.getByRole("button", { name: "Reset to defaults" });
    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(onChange).toHaveBeenCalledWith([...DEFAULT_VIDEO_LIST_COLUMN_IDS]);
    expect(onColumnWidthsChange).toHaveBeenCalledWith({});
  });
});

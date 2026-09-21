import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewCoverPanel } from "../components/ReviewCoverPanel";

const candidates = ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg", "https://cdn.example/c.jpg"];

describe("ReviewCoverPanel", () => {
  it("shows both covers for a conflict, frames the chosen one and reports the other side when picked", async () => {
    const onChoose = vi.fn();
    render(
      <ReviewCoverPanel
        status="conflict"
        chosen="target"
        currentUrl="/current.jpg"
        candidates={[candidates[0]]}
        incomingLabel="StashDB"
        onChoose={onChoose}
      />,
    );

    expect(screen.getByRole("radio", { name: "Keep current" })).toBeChecked();
    expect(screen.getByAltText("Current cover")).toHaveAttribute("src", "/current.jpg");
    expect(screen.getByAltText("Cover from StashDB")).toHaveAttribute("src", candidates[0]);
    expect(screen.queryByRole("button", { name: "Next cover" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Use StashDB" }));
    expect(onChoose).toHaveBeenCalledWith("source");
  });

  it("says what a conflict really is when the caller knows better than the default sentence", () => {
    render(
      <ReviewCoverPanel
        status="conflict"
        chosen="target"
        currentUrl="/current.jpg"
        candidates={[candidates[0]]}
        incomingLabel="StashDB"
        onChoose={vi.fn()}
        note="same cover, larger here (1920×1080 vs 1280×720)"
      />,
    );

    expect(screen.getByText(/same cover, larger here \(1920×1080 vs 1280×720\)/)).toBeInTheDocument();
    expect(screen.queryByText(/both have a value/)).not.toBeInTheDocument();
    // Still a choice, never a decision made for the person.
    expect(screen.getByRole("radio", { name: "Keep current" })).toBeChecked();
  });

  it("browses several candidates without changing the decision and loads only the one on screen", async () => {
    const onActiveIndexChange = vi.fn();
    const onChoose = vi.fn();
    render(
      <ReviewCoverPanel
        status="conflict"
        chosen="target"
        currentUrl="/current.jpg"
        candidates={candidates}
        activeIndex={0}
        onActiveIndexChange={onActiveIndexChange}
        incomingLabel="StashDB"
        onChoose={onChoose}
        aspect="portrait"
        subject="Image"
      />,
    );

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getAllByRole("img").map((image) => image.getAttribute("src"))).toEqual([
      "/current.jpg",
      candidates[0],
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("keeps a same-size placeholder when an image cannot load or a side has none", () => {
    render(
      <ReviewCoverPanel
        status="conflict"
        chosen="source"
        currentUrl={null}
        candidates={[candidates[0]]}
        incomingLabel="StashDB"
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText("No cover")).toBeInTheDocument();
    fireEvent.error(screen.getByAltText("Cover from StashDB"));
    expect(screen.getByText("Could not load")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Use StashDB" })).toBeChecked();
  });

  it("shows one image with its browser when the incoming cover simply fills an empty one", () => {
    render(
      <ReviewCoverPanel
        status="filled"
        chosen="source"
        currentUrl={null}
        candidates={candidates}
        activeIndex={1}
        onActiveIndexChange={vi.fn()}
        incomingLabel="StashDB"
        onChoose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByAltText("Cover from StashDB")).toHaveAttribute("src", candidates[1]);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("Cover · fills empty")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PaginationControls } from "../components/PaginationControls";

const ELLIPSIS = -1;

function renderControls(page: number, totalPages: number, goTo = vi.fn()) {
  const view = render(<PaginationControls page={page} totalPages={totalPages} goTo={goTo} />);
  return { ...view, goTo };
}

function readSlots(container: HTMLElement): number[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('button[aria-label^="Page "], span[aria-hidden="true"]'),
  ).map((slot) => (slot.tagName === "SPAN" ? ELLIPSIS : Number(slot.getAttribute("aria-label")?.replace("Page ", ""))));
}

function slotElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('button[aria-label^="Page "], span[aria-hidden="true"]'));
}

describe("PaginationControls", () => {
  it.each([
    [20, 1, [1, 2, 3, 4, 5, ELLIPSIS, 20]],
    [20, 2, [1, 2, 3, 4, 5, ELLIPSIS, 20]],
    [20, 3, [1, 2, 3, 4, 5, ELLIPSIS, 20]],
    [20, 4, [1, 2, 3, 4, 5, ELLIPSIS, 20]],
    [20, 5, [1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 20]],
    [20, 10, [1, ELLIPSIS, 9, 10, 11, ELLIPSIS, 20]],
    [20, 16, [1, ELLIPSIS, 15, 16, 17, ELLIPSIS, 20]],
    [20, 17, [1, ELLIPSIS, 16, 17, 18, 19, 20]],
    [20, 18, [1, ELLIPSIS, 16, 17, 18, 19, 20]],
    [20, 19, [1, ELLIPSIS, 16, 17, 18, 19, 20]],
    [20, 20, [1, ELLIPSIS, 16, 17, 18, 19, 20]],
    [8, 4, [1, 2, 3, 4, 5, ELLIPSIS, 8]],
    [8, 5, [1, ELLIPSIS, 4, 5, 6, 7, 8]],
    [9, 5, [1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 9]],
  ])("renders a fixed seven-slot window for %i pages on page %i", (totalPages, page, expected) => {
    const { container } = renderControls(page, totalPages);

    expect(readSlots(container)).toEqual(expected);
    expect(screen.getByRole("button", { name: `Page ${page}` })).toHaveAttribute("aria-current", "page");
  });

  it.each([8, 9, 20])("keeps the slot count constant on every page of a %i-page list", (totalPages) => {
    for (let page = 1; page <= totalPages; page += 1) {
      const { container, unmount } = renderControls(page, totalPages);
      const slots = readSlots(container);

      expect(slots).toHaveLength(7);
      expect(slots[0]).toBe(1);
      expect(slots[slots.length - 1]).toBe(totalPages);
      expect(slots).toContain(page);
      unmount();
    }
  });

  it.each([1, 4, 7])("lists every page of a seven-page list without ellipses on page %i", (page) => {
    const { container } = renderControls(page, 7);

    expect(readSlots(container)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(screen.queryByRole("button", { name: "Go to page" })).not.toBeInTheDocument();
  });

  it("gives numbers and ellipses the same width property and sizing classes", () => {
    const { container } = renderControls(10, 1087);
    const slots = slotElements(container);
    const [firstPage, ellipsis] = slots;

    expect(slots).toHaveLength(7);
    for (const slot of slots) {
      expect(slot.style.getPropertyValue("--page-slot")).toBe("calc(4ch + 1rem)");
    }
    expect(ellipsis.tagName).toBe("SPAN");
    // The ch unit in --page-slot resolves against each slot's own font, so font classes must match too.
    for (const sizingClass of [
      "min-w-[max(2.5rem,var(--page-slot))]",
      "sm:min-w-[max(28px,var(--page-slot))]",
      "text-sm",
      "sm:text-xs",
      "font-medium",
      "tabular-nums",
    ]) {
      expect(firstPage).toHaveClass(sizingClass);
      expect(ellipsis).toHaveClass(sizingClass);
    }
  });

  it("derives the slot width from the digit count of the total", () => {
    const { container } = renderControls(1, 20);

    for (const slot of slotElements(container)) {
      expect(slot.style.getPropertyValue("--page-slot")).toBe("calc(2ch + 1rem)");
    }
  });

  it("navigates when a page number is clicked", async () => {
    const user = userEvent.setup();
    const { goTo } = renderControls(10, 20);

    await user.click(screen.getByRole("button", { name: "Page 11" }));

    expect(goTo).toHaveBeenCalledWith(11);
  });
});

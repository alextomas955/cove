import { describe, expect, it } from "vitest";
import { countVisibleNavItems } from "../components/navOverflow";

describe("countVisibleNavItems", () => {
  it("keeps every item inline when they all fit, without reserving room for More", () => {
    expect(countVisibleNavItems([100, 100, 100], 300, 80)).toBe(3);
    expect(countVisibleNavItems([100, 100, 100], 304, 80, 2)).toBe(3);
  });

  it("reserves room for the More button once anything overflows", () => {
    // 3 items need 300px; only 299px are available, so More (80px) plus two items is the most that fits.
    expect(countVisibleNavItems([100, 100, 100], 299, 80)).toBe(2);
  });

  it("counts the gap between items and before the More button", () => {
    // More + gap + 100 + gap + 100 = 80 + 4 + 100 + 4 + 100 = 288
    expect(countVisibleNavItems([100, 100, 100, 100], 288, 80, 4)).toBe(2);
    expect(countVisibleNavItems([100, 100, 100, 100], 287, 80, 4)).toBe(1);
  });

  it("keeps display order and stops at the first item that does not fit", () => {
    // A narrow later item must not jump ahead of a wide earlier one.
    expect(countVisibleNavItems([60, 200, 40], 250, 50)).toBe(1);
  });

  it("moves everything into More when not even one item fits beside it", () => {
    expect(countVisibleNavItems([120, 120], 150, 80)).toBe(0);
  });

  it("handles an empty navigation", () => {
    expect(countVisibleNavItems([], 0, 80)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { applyPerformerContextTagEdits } from "../components/PerformerContextTags";

describe("applyPerformerContextTagEdits", () => {
  it("applies the user's additions and removals on top of the current context tags", () => {
    const baseline = { 1: [10, 11] };
    const edited = { 1: [10, 12] };
    // Performer 2 gained a context tag elsewhere after the form was filled.
    const current = { 1: [10, 11], 2: [20] };

    expect(applyPerformerContextTagEdits(current, baseline, edited)).toEqual({ 1: [10, 12], 2: [20] });
  });

  it("keeps the current context tags when the user changed none", () => {
    expect(applyPerformerContextTagEdits({ 1: [10], 3: [30] }, { 1: [10] }, { 1: [10] })).toEqual({
      1: [10],
      3: [30],
    });
  });
});

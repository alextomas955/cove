import { describe, expect, it } from "vitest";
import { applyPerformerContextTagEdits, performerContextTagsEqual } from "../components/PerformerContextTags";

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

describe("performerContextTagsEqual", () => {
  it("ignores tag order and performers without context tags", () => {
    expect(performerContextTagsEqual({ 1: [10, 11] }, { 1: [11, 10], 2: [] }, [1, 2])).toBe(true);
  });

  it("detects an added or removed performer context tag", () => {
    expect(performerContextTagsEqual({ 1: [10] }, { 1: [10], 2: [20] }, [1, 2])).toBe(false);
    expect(performerContextTagsEqual({ 1: [10, 11] }, { 1: [10] }, [1])).toBe(false);
  });

  it("ignores context tags of performers that are no longer selected", () => {
    expect(performerContextTagsEqual({ 1: [10] }, { 1: [10], 2: [20] }, [1])).toBe(true);
  });
});

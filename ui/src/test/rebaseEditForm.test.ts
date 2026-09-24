import { describe, expect, it, vi } from "vitest";
import { applyFormFields, untouchedFieldUpdates } from "../utils/rebaseEditForm";

describe("untouchedFieldUpdates", () => {
  const baseline = { title: "Loaded", tagIds: [1, 2], details: "Loaded details" };

  it("moves untouched fields to the refetched values and keeps touched ones", () => {
    const current = { ...baseline, title: "Typed by the user" };
    const next = { title: "Changed elsewhere", tagIds: [1, 2, 3], details: "Loaded details" };

    expect(untouchedFieldUpdates(current, baseline, next)).toEqual({ tagIds: [1, 2, 3] });
  });

  it("returns nothing when the refetch changed nothing the form shows", () => {
    expect(untouchedFieldUpdates({ ...baseline }, baseline, { ...baseline, tagIds: [1, 2] })).toEqual({});
  });
});

describe("applyFormFields", () => {
  it("calls the setter of each given field", () => {
    const setters = { title: vi.fn(), tagIds: vi.fn() };

    applyFormFields<{ title: string; tagIds: number[] }>({ tagIds: [3] }, setters);

    expect(setters.tagIds).toHaveBeenCalledWith([3]);
    expect(setters.title).not.toHaveBeenCalled();
  });
});

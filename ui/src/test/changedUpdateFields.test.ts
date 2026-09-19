import { describe, expect, it } from "vitest";
import { changedUpdateFields } from "../utils/changedUpdateFields";

describe("changedUpdateFields", () => {
  const baseline = {
    title: "Summer Set",
    studioId: 9 as number | undefined,
    tagIds: [8, 12],
    customFields: { mood: "bright", score: 3 } as Record<string, unknown>,
    clearFields: ["date"],
  };

  it("keeps only the fields that differ from the loaded entity", () => {
    const changed = changedUpdateFields(baseline, { ...baseline, title: "Renamed Set" });

    expect(changed).toEqual({ title: "Renamed Set" });
  });

  it("compares lists and objects by value", () => {
    const unchanged = changedUpdateFields(baseline, {
      ...baseline,
      tagIds: [8, 12],
      customFields: { score: 3, mood: "bright" },
    });
    expect(unchanged).toEqual({});

    const changed = changedUpdateFields(baseline, {
      ...baseline,
      tagIds: [12, 8, 20],
      customFields: { mood: "bright" },
    });
    expect(changed).toEqual({ tagIds: [12, 8, 20], customFields: { mood: "bright" } });
  });

  it("sends only newly cleared fields", () => {
    const changed = changedUpdateFields(baseline, {
      ...baseline,
      studioId: undefined,
      clearFields: ["date", "studioId"],
    });

    expect(changed).toEqual({ studioId: undefined, clearFields: ["studioId"] });
    expect(changedUpdateFields(baseline, { ...baseline })).not.toHaveProperty("clearFields");
  });

  it("keeps explicit nulls that differ from the loaded value", () => {
    const changed = changedUpdateFields(
      { color: "#ff0000" as string | null, tagGroupId: null as number | null },
      { color: null, tagGroupId: null },
    );

    expect(changed).toEqual({ color: null });
  });
});

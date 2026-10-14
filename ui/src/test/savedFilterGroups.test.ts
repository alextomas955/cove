import { describe, expect, it } from "vitest";
import { groupSavedFilters, splitSavedFilterName } from "../utils/savedFilterGroups";

const named = (...names: string[]) => names.map((name, id) => ({ id, name }));

describe("splitSavedFilterName", () => {
  it("splits on the first spaced slash", () => {
    expect(splitSavedFilterName("Needs work / No tags")).toEqual({ group: "Needs work", label: "No tags" });
    expect(splitSavedFilterName("A / B / C")).toEqual({ group: "A", label: "B / C" });
  });

  it("leaves names with an unspaced or one-sided slash ungrouped", () => {
    for (const name of ["1080p/4K", "AC/DC live", "Before /after", "Before/ after", "Trailing / ", " / Leading"]) {
      expect(splitSavedFilterName(name)).toEqual({ group: null, label: name });
    }
  });

  it("trims extra spaces around the separator", () => {
    expect(splitSavedFilterName("Length  /  Short")).toEqual({ group: "Length", label: "Short" });
  });
});

describe("groupSavedFilters", () => {
  it("lists groups by name first, then ungrouped filters, keeping order within a section", () => {
    const sections = groupSavedFilters(
      named("Recently added", "zeta / One", "Alpha / Two", "Alpha / One", "1080p/4K", "alpha / Three"),
    );

    expect(sections.map((section) => section.group)).toEqual(["Alpha", "zeta", null]);
    expect(sections[0].items.map((item) => item.label)).toEqual(["Two", "One", "Three"]);
    expect(sections[2].items.map((item) => item.label)).toEqual(["Recently added", "1080p/4K"]);
  });

  it("matches the query against the whole name and drops empty groups", () => {
    const filters = named("Length / Under 5 min", "Length / Over 1 hour", "Needs work / No tags", "Minimal");

    expect(
      groupSavedFilters(filters, " MIN ").map((section) => [section.group, section.items.map((i) => i.label)]),
    ).toEqual([
      ["Length", ["Under 5 min"]],
      [null, ["Minimal"]],
    ]);
    expect(groupSavedFilters(filters, "length").flatMap((section) => section.items)).toHaveLength(2);
    expect(groupSavedFilters(filters, "work / no")[0].items[0].label).toBe("No tags");
    expect(groupSavedFilters(filters, "nothing")).toEqual([]);
  });

  it("keeps a group's spelling from its first filter even when that filter does not match", () => {
    const sections = groupSavedFilters(named("Alpha / One", "alpha / Three"), "three");

    expect(sections.map((section) => section.group)).toEqual(["Alpha"]);
  });
});

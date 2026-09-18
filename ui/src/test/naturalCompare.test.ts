import { describe, expect, it } from "vitest";
import { compareNatural } from "../utils/naturalCompare";

describe("compareNatural", () => {
  it("orders digit runs by value", () => {
    expect(["image_10", "image_2", "image_1"].sort(compareNatural)).toEqual(["image_1", "image_2", "image_10"]);
  });

  it("ignores case", () => {
    expect(["Zed", "abby", "Abel"].sort(compareNatural)).toEqual(["abby", "Abel", "Zed"]);
  });
});

import { describe, expect, it } from "vitest";
import { videoEditClearFields } from "../utils/videoEditClearFields";

describe("videoEditClearFields", () => {
  it("marks cleared date, studio and production date values", () => {
    expect(videoEditClearFields("", undefined, "")).toEqual(["date", "studioId", "productionDate"]);
  });

  it("does not mark populated values", () => {
    expect(videoEditClearFields("2026-05-01", 9, "2025-11")).toEqual([]);
  });
});

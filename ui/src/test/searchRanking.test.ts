import { describe, expect, it } from "vitest";
import { rankByLabel, rankSearchOptions } from "../utils/searchRanking";

describe("rankSearchOptions", () => {
  it("orders by exact, prefix, word start, then substring match", () => {
    const options = ["Grand Piano", "Piano Solo", "Electropiano", "Piano", "Piano Coda"].map((label) => ({ label }));

    expect(rankSearchOptions(options, "piano").map((option) => option.label)).toEqual([
      "Piano",
      "Piano Coda",
      "Piano Solo",
      "Grand Piano",
      "Electropiano",
    ]);
  });

  it("ranks favorites ahead of better non-favorite matches", () => {
    const options = [
      { label: "Needle Actor" },
      { label: "Golden Needle" },
      { label: "Needle" },
      { label: "Needle Artist", favorite: true },
      { label: "Jane Doe", favorite: true },
    ];

    expect(rankSearchOptions(options, "Needle").map((option) => option.label)).toEqual([
      "Needle Artist",
      "Jane Doe",
      "Needle",
      "Needle Actor",
      "Golden Needle",
    ]);
  });

  it("leaves order untouched without a search term", () => {
    const options = [{ label: "B" }, { label: "A", favorite: true }];

    expect(rankSearchOptions(options, "  ").map((option) => option.label)).toEqual(["B", "A"]);
  });
});

describe("rankByLabel", () => {
  it("accepts a favorite accessor", () => {
    const items = [
      { id: 1, name: "Needle", favorite: false },
      { id: 2, name: "Needle Artist", favorite: true },
    ];

    expect(
      rankByLabel(
        items,
        "needle",
        (item) => item.name,
        (item) => item.favorite,
      ).map((item) => item.id),
    ).toEqual([2, 1]);
  });
});

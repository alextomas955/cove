import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetadataDiff, defaultDiffSelection, type DiffField, type DiffRecord } from "../components/MetadataDiff";

const fields: DiffField[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "empty", label: "Empty field" },
  { key: "missing", label: "Missing field" },
  { key: "same", label: "Same field" },
  { key: "tags", label: "Tags", kind: "list", itemKey: (item) => String(item).toLowerCase() },
  { key: "cover", label: "Cover", render: (value) => <img alt="Custom cover" src={String(value)} /> },
];
const source: DiffRecord = {
  label: "Scraped metadata",
  values: {
    title: "Scraped title",
    description: "Scraped description",
    empty: null,
    same: "Same",
    tags: ["Shared", "New"],
    cover: "/source.png",
  },
};
const target: DiffRecord = {
  label: "Library metadata",
  values: {
    title: "Library title",
    description: "Library description",
    empty: "Populated",
    missing: "Present",
    same: "Same",
    tags: ["shared", "Existing"],
    cover: "/target.png",
  },
};
function Harness() {
  const [value, onChange] = useState(() => defaultDiffSelection(fields, source, target));
  return <MetadataDiff {...{ fields, source, target, value, onChange }} />;
}
describe("MetadataDiff", () => {
  it("independently chooses scalar fields and an explicit empty value", () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Title from source"));
    fireEvent.click(screen.getByLabelText("Empty field from source"));
    expect(screen.getByLabelText("Title from source")).toBeChecked();
    expect(screen.getByLabelText("Description from target")).toBeChecked();
    expect(screen.getByLabelText("Empty field from source")).toBeChecked();
    expect(screen.getByLabelText("Missing field from source")).toBeDisabled();
    expect(within(screen.getByRole("group", { name: "Title" })).getAllByText("Scraped title")).toHaveLength(2);
  });
  it("deduplicates lists by adapter identity and allows deselecting shared and unique items", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Remove Tags: shared" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Tags: new" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Tags: existing" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Tags: shared" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Tags: new" }));
    expect(screen.getByRole("button", { name: "Add Tags: shared" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Tags: existing" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tags: Source only" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tags: Target only" })).toBeInTheDocument();
  });
  it("groups common values first and applies source, target, and combined presets", () => {
    render(<Harness />);
    expect(screen.getAllByRole("region").map((item) => item.getAttribute("aria-label"))).toEqual([
      "Tags: In both",
      "Tags: Source only",
      "Tags: Target only",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Use source Tags" }));
    expect(screen.getByRole("button", { name: "Remove Tags: shared" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Tags: new" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Tags: existing" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use target Tags" }));
    expect(screen.getByRole("button", { name: "Add Tags: new" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Tags: existing" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Tags: new" }));
    expect(screen.getByRole("button", { name: "Remove Tags: new" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tags" })).queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use combined Tags" }));
    expect(screen.getByRole("button", { name: "Remove Tags: new" })).toBeInTheDocument();
  });
  it("renders adapter visuals and hides only identical fields", () => {
    render(<Harness />);
    expect(screen.getAllByAltText("Custom cover")).toHaveLength(3);
    fireEvent.click(screen.getByLabelText("Hide identical fields"));
    expect(screen.queryByRole("group", { name: /Same field/ })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Title" })).toBeInTheDocument();
  });
});

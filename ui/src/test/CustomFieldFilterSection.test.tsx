import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CustomFieldCriterion, CustomFieldDefinition } from "../api/types";
import { createCustomFieldFilterSection } from "../components/CustomFieldFilterSection";

const baseDefinition: CustomFieldDefinition = {
  id: 1,
  key: "recorded_at",
  label: "Recorded At",
  type: "timestamp",
  entityTypes: ["video"],
  options: [],
  filterable: true,
  sortable: true,
  isMultiValue: false,
  displayOrder: 0,
};
const timestampDefinition = baseDefinition;
const dateDefinition: CustomFieldDefinition = {
  ...baseDefinition,
  id: 2,
  key: "recorded_on",
  label: "Recorded On",
  type: "date",
};
const section = createCustomFieldFilterSection([timestampDefinition, dateDefinition]);

function criterion(key: string, value: string, modifier: CustomFieldCriterion["modifier"] = "GREATER_THAN") {
  return { key, value, modifier } as CustomFieldCriterion;
}

describe("custom field filter section relative dates", () => {
  it("accepts minute and second offsets on a timestamp field", () => {
    const value = [criterion("recorded_at", "-1h30min")];
    expect(section.isActive(value)).toBe(true);
    expect(section.sanitize?.(value)).toEqual([{ ...value[0], type: "timestamp", jsonPath: undefined }]);
    expect(section.summarize?.(value)).toBe("Recorded At > 1 hour 30 minutes ago");

    render(<>{section.renderEditor(value, () => {})}</>);
    const input = screen.getByDisplayValue("-1h30min");
    expect(input).toBeValid();
    expect(input).toHaveAttribute("placeholder", "yyyy-MM-ddTHH:mm:ss or -1h30min");
  });

  it("accepts day offsets but rejects time units on a date field", () => {
    expect(section.isActive([criterion("recorded_on", "-7d")])).toBe(true);
    const value = [criterion("recorded_on", "-30min")];
    expect(section.isActive(value)).toBe(false);

    render(<>{section.renderEditor(value, () => {})}</>);
    expect(screen.getByDisplayValue("-30min")).toBeInvalid();
  });

  it("drops malformed offsets instead of sending them", () => {
    expect(section.sanitize?.([criterion("recorded_at", "-30s1min")])).toEqual([]);
    expect(
      section.sanitize?.([{ ...criterion("recorded_at", "-1h", "BETWEEN"), value2: "+1.5s" } as CustomFieldCriterion]),
    ).toEqual([]);
  });
});

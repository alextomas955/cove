import { describe, expect, it } from "vitest";
import {
  PERFORMER_GENDER_OPTIONS,
  buildAllowedGenderKeys,
  isGenderOptionChecked,
  isPerformerGenderAllowed,
  normalizeGenderKey,
  toggleGenderOption,
} from "../utils/performerGenders";

describe("performer gender rules", () => {
  it("normalizes the way the backend does", () => {
    expect(normalizeGenderKey("Transgender Female")).toBe("TRANSGENDERFEMALE");
    expect(normalizeGenderKey("TRANSGENDER_FEMALE")).toBe("TRANSGENDERFEMALE");
    expect(normalizeGenderKey("Non-Binary")).toBe("NONBINARY");
    expect(normalizeGenderKey(undefined)).toBe("");
  });

  it("filters nothing only when every option is checked", () => {
    expect(buildAllowedGenderKeys([...PERFORMER_GENDER_OPTIONS])).toBeNull();
    // A variant spelling still counts as that option, so the full set is still the full set.
    expect(
      buildAllowedGenderKeys(["FEMALE", "male", "Transgender_Female", ...PERFORMER_GENDER_OPTIONS.slice(3)]),
    ).toBeNull();
    expect(buildAllowedGenderKeys(["Female"])).toEqual(new Set(["FEMALE"]));
  });

  it("keeps an empty selection an empty set, never 'no filter'", () => {
    const allowed = buildAllowedGenderKeys([]);
    expect(allowed).toEqual(new Set());
    expect(isPerformerGenderAllowed("FEMALE", allowed)).toBe(false);
    expect(isPerformerGenderAllowed(undefined, allowed)).toBe(false);
  });

  it("treats an unstated gender as Unknown", () => {
    const withUnknown = buildAllowedGenderKeys(["Female", "Unknown"]);
    expect(isPerformerGenderAllowed(undefined, withUnknown)).toBe(true);
    expect(isPerformerGenderAllowed("  ", withUnknown)).toBe(true);
    expect(isPerformerGenderAllowed("MALE", withUnknown)).toBe(false);

    const withoutUnknown = buildAllowedGenderKeys(["Female"]);
    expect(isPerformerGenderAllowed(undefined, withoutUnknown)).toBe(false);
    expect(isPerformerGenderAllowed("FEMALE", withoutUnknown)).toBe(true);
  });

  it("reads and writes a checkbox by key, so a variant spelling cannot desync the box", () => {
    expect(isGenderOptionChecked(["FEMALE"], "Female")).toBe(true);
    expect(isGenderOptionChecked(["Non Binary"], "Non-Binary")).toBe(true);
    expect(isGenderOptionChecked(["Female"], "Male")).toBe(false);

    // Unchecking removes every spelling, so the box cannot come back checked from a leftover.
    expect(toggleGenderOption(["FEMALE", "Female", "Male"], "Female", false)).toEqual(["Male"]);
    expect(toggleGenderOption(["Male"], "Female", true)).toEqual(["Male", "Female"]);
    // Checking one already present does not duplicate it.
    expect(toggleGenderOption(["FEMALE"], "Female", true)).toEqual(["Female"]);
  });
});

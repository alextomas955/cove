import { describe, expect, it } from "vitest";
import {
  collapseExtensionCriteria,
  executableExtensionFilterKey,
  expandExtensionCriteria,
  extensionFilterKey,
  unavailableExtensionCriterionDefinitions,
} from "../extensions/extensionListFilters";
import { isCriterionValueValid } from "../components/filterCriterionState";

describe("extension list filter object representation", () => {
  it("round-trips namespaced criteria without changing core filters", () => {
    const saved = {
      favoriteCriterion: { value: true },
      extensionCriteria: [
        {
          extensionId: "midnight-rider.animated-tag-previews",
          filterId: "has-preview",
          modifier: "equals",
          value: false,
        },
      ],
    };

    const expanded = expandExtensionCriteria(saved);
    expect(expanded[extensionFilterKey("midnight-rider.animated-tag-previews", "has-preview")]).toEqual({
      modifier: "EQUALS",
      value: false,
    });
    expect(collapseExtensionCriteria(expanded)).toEqual(saved);
  });

  it("carries an entity picker's excludes and depth inside one multi-ID value", () => {
    const key = extensionFilterKey("owner.segments", "segment-tags");
    const saved = {
      extensionCriteria: [
        {
          extensionId: "owner.segments",
          filterId: "segment-tags",
          modifier: "includes",
          value: { value: [3, 4], excludes: [9], depth: -1 },
        },
      ],
    };

    const expanded = expandExtensionCriteria(saved);
    expect(expanded[key]).toEqual({ modifier: "INCLUDES", value: [3, 4], excludes: [9], depth: -1 });
    expect(collapseExtensionCriteria(expanded, undefined, new Set([key]))).toEqual(saved);
  });

  it("drops picker display names and packs null modifiers as an empty multi-ID value", () => {
    const tagsKey = extensionFilterKey("owner.segments", "segment-tags");
    const emptyKey = extensionFilterKey("owner.segments", "slot-performers");

    const collapsed = collapseExtensionCriteria(
      {
        [tagsKey]: { modifier: "INCLUDES_ALL", value: [3], _names: { 3: "Kissing" } },
        [emptyKey]: { modifier: "IS_NULL" },
      },
      undefined,
      new Set([tagsKey, emptyKey]),
    );

    expect(collapsed.extensionCriteria).toEqual([
      { extensionId: "owner.segments", filterId: "segment-tags", modifier: "includesall", value: { value: [3] } },
      { extensionId: "owner.segments", filterId: "slot-performers", modifier: "isnull", value: {} },
    ]);
    expect(expandExtensionCriteria(collapsed)[emptyKey]).toEqual({ modifier: "IS_NULL", value: [] });
  });

  it("describes an unavailable multi-ID criterion so the filter dialog can validate it", () => {
    const saved = {
      extensionCriteria: [
        { extensionId: "missing.extension", filterId: "segment-tags", modifier: "includes", value: { value: [7] } },
      ],
    };

    const [definition] = unavailableExtensionCriterionDefinitions(saved, []);
    const expanded = expandExtensionCriteria(saved);

    expect(definition.type).toBe("multiId");
    expect(() => isCriterionValueValid(expanded[definition.filterKey], definition)).not.toThrow();
    expect(isCriterionValueValid(expanded[definition.filterKey], definition)).toBe(true);
    expect(isCriterionValueValid({ modifier: "EQUALS", value: [7] }, { ...definition, type: "string" })).toBe(false);
  });

  it("keeps a saved multi-ID criterion intact while its owner is unavailable", () => {
    const saved = {
      extensionCriteria: [
        {
          extensionId: "missing.extension",
          filterId: "segment-tags",
          modifier: "excludes",
          value: { value: [7], depth: -1 },
        },
      ],
    };

    expect(collapseExtensionCriteria(expandExtensionCriteria(saved))).toEqual(saved);
  });

  it("marks a saved criterion unavailable without discarding it", () => {
    const saved = {
      extensionCriteria: [{ extensionId: "missing.extension", filterId: "owned", modifier: "equals", value: true }],
    };

    const definitions = unavailableExtensionCriterionDefinitions(saved, []);

    expect(definitions).toEqual([
      expect.objectContaining({
        label: "Unavailable extension filter (missing.extension/owned)",
        supported: false,
      }),
    ]);
    expect(collapseExtensionCriteria(expandExtensionCriteria(saved))).toEqual(saved);
  });

  it("scopes executable filters to the lists that run them and gives their namespace precedence over legacy keys", () => {
    const dualDeclaration = {
      id: "owned",
      entityType: "tags",
      label: "Owned",
      criterionType: "boolean",
      extensionId: "owner.actual",
      filterKey: "favoriteCriterion",
      filterId: "has-preview",
      order: 100,
    };

    expect(executableExtensionFilterKey(dualDeclaration)).toBe(extensionFilterKey("owner.actual", "has-preview"));
    expect(executableExtensionFilterKey({ ...dualDeclaration, entityType: "videos" })).toBe(
      extensionFilterKey("owner.actual", "has-preview"),
    );
    expect(executableExtensionFilterKey({ ...dualDeclaration, entityType: "video" })).toBe(
      extensionFilterKey("owner.actual", "has-preview"),
    );
    expect(executableExtensionFilterKey({ ...dualDeclaration, entityType: "performers" })).toBeNull();
  });

  it("does not throw on malformed percent encoding in imported filter keys", () => {
    const malformed = { "extension-filter:%E0%A4%A:owned": { modifier: "EQUALS", value: true } };
    expect(collapseExtensionCriteria(malformed)).toEqual(malformed);
  });

  it("preserves structurally malformed saved extension criteria without dereferencing them", () => {
    const saved = {
      extensionCriteria: [null, 42, { extensionId: "owner", filterId: "owned", modifier: "equals" }],
    };

    expect(() => unavailableExtensionCriterionDefinitions(saved, [])).not.toThrow();
    expect(unavailableExtensionCriterionDefinitions(saved, [])).toEqual([]);
    expect(expandExtensionCriteria(saved).extensionCriteria).toEqual(saved.extensionCriteria);
    expect(collapseExtensionCriteria({}, saved)).toEqual(saved);
  });
});

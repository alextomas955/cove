import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiAnalysisCriterion, AiRunFacets } from "../api/types";
import { AiAnalysisEditor } from "../components/AiAnalysisFilterEditor";
import { formatFilterChipValue } from "../components/ActiveObjectFilterChips";
import { formatAiAnalysisSummary, sanitizeAiAnalysisCriterion } from "../components/aiAnalysisFilter";
import { FilterDialog } from "../components/FilterDialog";
import { IMAGE_CRITERIA, VIDEO_CRITERIA } from "../components/filterCriteriaCatalogs";
import { isCriterionValueValid, sanitizeFilterCriteria } from "../components/filterCriterionState";
import type { CriterionDefinition } from "../components/filterCriteriaTypes";
import { describeFilterExpressionCondition } from "../components/filterExpressionExplanation";
import { toPortableObjectFilter } from "../utils/portableSavedFilter";
import { formatSourceKeyLabel } from "../utils/sourceKeyLabel";

const { facets, permissions } = vi.hoisted(() => ({
  facets: vi.fn(),
  permissions: { allowed: new Set<string>(["airuns.read"]) },
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, aiRuns: { ...actual.aiRuns, facets } };
});

vi.mock("../auth/optionalAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/optionalAuth")>();
  return {
    ...actual,
    useOptionalAuth: () => ({ hasPermission: (permission: string) => permissions.allowed.has(permission) }),
  };
});

const videoCriterion = VIDEO_CRITERIA.find((criterion) => criterion.id === "aiAnalysis") as CriterionDefinition;
const oneSource: AiRunFacets = { sources: [{ sourceKey: "ext:ai.core", runCount: 1200 }] };
const twoSources: AiRunFacets = {
  sources: [
    { sourceKey: "ext:ai.core", runCount: 1200 },
    { sourceKey: "ext:other.tagger", runCount: 40 },
  ],
};

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// Holds the criterion like the filter dialog does, so successive edits build on each other.
function StatefulEditor({ initial, onChange }: { initial?: AiAnalysisCriterion; onChange: (v: unknown) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <AiAnalysisEditor
      value={value}
      onChange={(next) => {
        setValue(next as AiAnalysisCriterion);
        onChange(next);
      }}
      targetType="video"
    />
  );
}

beforeEach(() => {
  facets.mockReset();
  permissions.allowed = new Set(["airuns.read"]);
});

describe("AI analysis criterion editor", () => {
  it("fixes the only source and writes it with the first state", async () => {
    facets.mockResolvedValue(oneSource);
    const onChange = vi.fn();
    renderWithQueryClient(<AiAnalysisEditor value={undefined} onChange={onChange} targetType="video" />);

    expect(await screen.findByText("AI Core")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Latest failed" }));

    expect(onChange).toHaveBeenCalledWith({ sourceKey: "ext:ai.core", _singleSource: true, states: ["failed"] });
    expect(facets).toHaveBeenCalledWith("video");
  });

  it("offers any source or one of several", async () => {
    facets.mockResolvedValue(twoSources);
    const onChange = vi.fn();
    renderWithQueryClient(<AiAnalysisEditor value={{ states: ["failed"] }} onChange={onChange} targetType="image" />);

    const select = await screen.findByRole("combobox", { name: "Source" });
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "Any source" })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "ext:other.tagger" } });

    expect(onChange).toHaveBeenLastCalledWith({ sourceKey: "ext:other.tagger", states: ["failed"] });
  });

  it("toggles state pills and the needs-analysis shortcut without selecting failed", async () => {
    facets.mockResolvedValue(oneSource);
    const onChange = vi.fn();
    renderWithQueryClient(<StatefulEditor initial={{ states: [] }} onChange={onChange} />);
    await screen.findByText("AI Core");

    fireEvent.click(screen.getByRole("button", { name: "Needs analysis" }));
    const needsAnalysis = onChange.mock.lastCall?.[0];
    expect(needsAnalysis.states).toEqual(["neverRun", "cancelled"]);
    expect(needsAnalysis.states).not.toContain("failed");

    expect(screen.getByRole("button", { name: "Needs analysis" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Never run" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Latest cancelled" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Latest failed" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Latest failed" }));
    expect(onChange.mock.lastCall?.[0].states).toEqual(["neverRun", "failed", "cancelled"]);
  });

  it("keeps model and date collapsed until opened or set, and loads models only then", async () => {
    facets.mockImplementation(async (_target: string, opts?: { includeModels?: boolean }) =>
      opts?.includeModels ? { ...oneSource, models: [{ key: "clip_v2", name: "CLIP v2" }] } : oneSource,
    );
    const onChange = vi.fn();
    renderWithQueryClient(<StatefulEditor initial={{ states: ["completed"] }} onChange={onChange} />);
    await screen.findByText("AI Core");

    const toggle = screen.getByRole("button", { name: "Model and date" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Last analysed")).not.toBeInTheDocument();
    expect(facets).not.toHaveBeenCalledWith("video", expect.objectContaining({ includeModels: true }));

    fireEvent.click(toggle);
    const model = await screen.findByRole("checkbox", { name: "CLIP v2 (clip_v2)" });
    expect(facets).toHaveBeenCalledWith("video", { sourceKey: "ext:ai.core", includeModels: true });
    fireEvent.click(screen.getByRole("button", { name: "Not used" }));
    fireEvent.click(model);
    expect(onChange.mock.lastCall?.[0]).toMatchObject({ modelKeys: ["clip_v2"], modelModifier: "EXCLUDES" });
    expect(screen.getByText("Not used also matches items that were never analysed.")).toBeInTheDocument();
  });

  it("opens the details when a loaded criterion sets a model or a date", async () => {
    facets.mockResolvedValue({ ...oneSource, models: [] });
    renderWithQueryClient(
      <AiAnalysisEditor
        value={{ sourceKey: "ext:ai.core", analysedAtCriterion: { value: "-30d", modifier: "LESS_THAN" } }}
        onChange={vi.fn()}
        targetType="video"
      />,
    );

    expect(screen.getByRole("button", { name: "Model and date" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Last analysed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Before" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Never completed" })).toBeInTheDocument();
  });
});

describe("AI analysis criterion state", () => {
  it("is valid only when it tests a state, a model or a date", () => {
    expect(isCriterionValueValid({ sourceKey: "ext:ai.core" }, videoCriterion)).toBe(false);
    expect(isCriterionValueValid({ states: [] }, videoCriterion)).toBe(false);
    expect(isCriterionValueValid({ modelKeys: ["  "] }, videoCriterion)).toBe(false);
    expect(isCriterionValueValid({ analysedAtCriterion: { value: "", modifier: "LESS_THAN" } }, videoCriterion)).toBe(
      false,
    );
    expect(
      isCriterionValueValid({ analysedAtCriterion: { value: "-2x", modifier: "LESS_THAN" } }, videoCriterion),
    ).toBe(false);
    expect(isCriterionValueValid({ states: ["failed"] }, videoCriterion)).toBe(true);
    expect(isCriterionValueValid({ modelKeys: ["clip_v2"] }, videoCriterion)).toBe(true);
    expect(isCriterionValueValid({ analysedAtCriterion: { value: "", modifier: "IS_NULL" } }, videoCriterion)).toBe(
      true,
    );
    expect(
      isCriterionValueValid({ analysedAtCriterion: { value: "-30d", modifier: "LESS_THAN" } }, videoCriterion),
    ).toBe(true);
  });

  it("sanitizes to what the server reads", () => {
    expect(
      sanitizeFilterCriteria(
        {
          aiAnalysisCriterion: {
            sourceKey: "ext:ai.core",
            _singleSource: true,
            states: ["cancelled", "neverRun", "cancelled", "bogus"],
            modelKeys: [" clip_v2 ", ""],
            modelModifier: "EXCLUDES",
            analysedAtCriterion: { value: "", modifier: "LESS_THAN" },
          },
        },
        [videoCriterion],
      ),
    ).toEqual({
      aiAnalysisCriterion: {
        sourceKey: "ext:ai.core",
        _singleSource: true,
        states: ["neverRun", "cancelled"],
        modelKeys: ["clip_v2"],
        modelModifier: "EXCLUDES",
      },
    });
    expect(sanitizeAiAnalysisCriterion({ sourceKey: "ext:ai.core" })).toBeUndefined();
  });
});

describe("AI analysis summaries", () => {
  it("words chips plainly and leaves out a single source", () => {
    const chip = (value: unknown) => formatFilterChipValue(videoCriterion, value);
    expect(chip({ sourceKey: "ext:ai.core", _singleSource: true, states: ["failed"] })).toBe("latest failed");
    expect(chip({ states: ["failed", "neverRun"] })).toBe("never run or latest failed");
    expect(chip({ states: ["neverRun", "cancelled"] })).toBe("needs analysis");
    expect(chip({ states: ["neverRun", "cancelled", "failed"] })).toBe("never run, latest failed or latest cancelled");
    expect(chip({ sourceKey: "ext:ai.core", states: ["completed"] })).toBe("AI Core · latest completed");
    expect(
      chip({
        states: ["completed"],
        modelKeys: ["clip_v1"],
        modelModifier: "EXCLUDES",
        analysedAtCriterion: { value: "-30d", modifier: "LESS_THAN" },
      }),
    ).toBe("latest completed · without model clip_v1 · last analysed before 30 days ago");
    expect(chip({ modelKeys: ["a", "b"] })).toBe("with models a or b");
    expect(chip({ analysedAtCriterion: { value: "", modifier: "IS_NULL" } })).toBe("never completed");
    expect(
      chip({ analysedAtCriterion: { value: "2026-01-01T00:00", value2: "2026-02-01T00:00", modifier: "BETWEEN" } }),
    ).toBe("last analysed between 2026-01-01 00:00 and 2026-02-01 00:00");
  });

  it("explains an expression condition with the same wording", () => {
    expect(
      describeFilterExpressionCondition(
        { aiAnalysisCriterion: { states: ["neverRun", "failed"] } },
        VIDEO_CRITERIA as CriterionDefinition[],
        { type: "stars", starPrecision: "full" } as never,
        [],
      ),
    ).toBe("AI Analysis: never run or latest failed");
    expect(formatAiAnalysisSummary(undefined)).toBe("not set");
  });

  it("labels extension sources with their acronyms", () => {
    expect(formatSourceKeyLabel("ext:ai.core")).toBe("AI Core");
    expect(formatSourceKeyLabel("ext:visual-similarity")).toBe("Visual Similarity");
    expect(formatSourceKeyLabel("user")).toBe("User");
  });
});

describe("AI analysis in saved filters and catalogs", () => {
  it("exports portably without client-only hints", () => {
    const { objectFilter, omitted } = toPortableObjectFilter(
      {
        aiAnalysisCriterion: {
          sourceKey: "ext:ai.core",
          _singleSource: true,
          states: ["failed"],
          analysedAtCriterion: { value: "-7d", modifier: "GREATER_THAN" },
        },
      },
      VIDEO_CRITERIA as CriterionDefinition[],
      "videos",
      new Map(),
    );

    expect(omitted).toEqual([]);
    expect(objectFilter).toEqual({
      aiAnalysisCriterion: {
        sourceKey: "ext:ai.core",
        states: ["failed"],
        analysedAtCriterion: { value: "-7d", modifier: "GREATER_THAN" },
      },
    });
  });

  it("is offered for videos and images behind airuns.read", () => {
    for (const [catalog, target] of [
      [VIDEO_CRITERIA, "video"],
      [IMAGE_CRITERIA, "image"],
    ] as const) {
      const definition = (catalog as CriterionDefinition[]).find((criterion) => criterion.id === "aiAnalysis");
      expect(definition).toMatchObject({
        type: "aiAnalysis",
        filterKey: "aiAnalysisCriterion",
        aiTargetType: target,
        requiredPermission: "airuns.read",
      });
    }
  });
});

describe("AI analysis in the filter dialog", () => {
  function renderDialog(activeFilter: Record<string, unknown> = {}) {
    return renderWithQueryClient(
      <FilterDialog open onClose={vi.fn()} criteria={VIDEO_CRITERIA} activeFilter={activeFilter} onApply={vi.fn()} />,
    );
  }

  it("is found by what people search for", async () => {
    facets.mockResolvedValue(oneSource);
    renderDialog();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search filter criteria" }), {
      target: { value: "failed" },
    });

    await waitFor(() => expect(screen.getByRole("tab", { name: /AI Analysis/ })).toBeInTheDocument());
  });

  it("is hidden without airuns.read but stays removable when already active", () => {
    permissions.allowed = new Set();
    facets.mockResolvedValue(oneSource);
    const { unmount } = renderDialog();
    expect(screen.queryByRole("tab", { name: /AI Analysis/ })).not.toBeInTheDocument();
    unmount();

    renderDialog({ aiAnalysisCriterion: { states: ["failed"] } });
    expect(screen.getByRole("tab", { name: /AI Analysis/ })).toBeInTheDocument();
  });
});

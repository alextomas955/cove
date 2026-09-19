import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TagDetail } from "../api/types";
import { TagEditModal } from "../pages/TagEditModal";

const mocks = vi.hoisted(() => ({
  tagsUpdate: vi.fn(),
  tagGroupsList: vi.fn(),
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    tags: { ...actual.tags, update: mocks.tagsUpdate },
    tagGroups: { ...actual.tagGroups, list: mocks.tagGroupsList },
  };
});

vi.mock("../components/EntityReferenceSelector", () => ({
  EntityReferenceMultiSelector: () => <div>Tag selector</div>,
}));

vi.mock("../components/shared", () => ({
  CustomFieldsEditor: () => <div>Custom Fields Editor</div>,
  buildTagProvenanceById: () => ({}),
}));

vi.mock("../components/RemoteIdsEditor", () => ({
  RemoteIdsEditor: () => <div>Remote IDs Editor</div>,
  normalizeRemoteIds: (values: unknown[]) => values,
}));

const tag = {
  id: 1,
  name: "Original",
  aliases: [],
  parents: [],
  children: [],
  remoteIds: [],
  customFields: {},
} as unknown as TagDetail;

function renderTag(overrides: Record<string, unknown>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TagEditModal tag={{ ...tag, ...overrides } as TagDetail} open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

// The JSON body actually sent, so omitted and undefined fields compare the same way the API sees them.
async function sentBody() {
  await waitFor(() => expect(mocks.tagsUpdate).toHaveBeenCalled());
  return JSON.parse(JSON.stringify(mocks.tagsUpdate.mock.calls.at(-1)?.[1]));
}

describe("TagEditModal", () => {
  beforeEach(() => {
    mocks.tagsUpdate.mockReset();
    mocks.tagGroupsList.mockReset().mockResolvedValue([]);
  });

  it("shows a name conflict inside the dialog without API formatting", async () => {
    const user = userEvent.setup();
    mocks.tagsUpdate.mockRejectedValue(
      new Error('API Error 409: {"message":"Tag name or alias \'Existing\' already exists"}'),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TagEditModal tag={tag} open onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const nameInput = screen.getByPlaceholderText("Tag name");
    await user.clear(nameInput);
    await user.type(nameInput, "Existing");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Tag name or alias 'Existing' already exists");
    expect(alert).not.toHaveTextContent("API Error 409");
    expect(alert).not.toHaveTextContent('{"message"');
    expect(screen.getByRole("heading", { name: "Edit Tag: Original" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sends only the fields the user changed", async () => {
    const user = userEvent.setup();
    mocks.tagsUpdate.mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const styledTag = {
      ...tag,
      color: "#ff0000",
      tagGroupId: 3,
      aliases: ["Alias"],
      parents: [{ id: 5, name: "Parent" }],
      customFields: { mood: "bright" },
    } as unknown as TagDetail;

    render(
      <QueryClientProvider client={queryClient}>
        <TagEditModal tag={styledTag} open onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const nameInput = screen.getByPlaceholderText("Tag name");
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mocks.tagsUpdate).toHaveBeenCalledWith(1, { name: "Renamed" });

    mocks.tagsUpdate.mockClear();
    await user.clear(screen.getByPlaceholderText("#6ee7b7"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    // A cleared display setting is removed through clearFields; the others stay untouched.
    expect(await sentBody()).toEqual({ name: "Renamed", clearFields: ["color"] });
  });

  it("leaves hidden segment overrides untouched when the player bar mode does not change", async () => {
    mocks.tagsUpdate.mockResolvedValue({});
    renderTag({ showAsSegment: null, segmentColorOverride: "#abcabc", segmentLaneOverride: 2 });

    fireEvent.change(screen.getByPlaceholderText("Tag name"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await sentBody()).toEqual({ name: "Renamed" });
  });

  it("clears a stored segment override the user empties after switching to always", async () => {
    mocks.tagsUpdate.mockResolvedValue({});
    renderTag({ showAsSegment: null, segmentColorOverride: "#abcabc" });

    fireEvent.change(screen.getByDisplayValue("Default - follow display profiles"), { target: { value: "always" } });
    fireEvent.change(screen.getByDisplayValue("#abcabc"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await sentBody()).toEqual({ showAsSegment: true, clearFields: ["segmentColorOverride"] });
  });

  it("clears segment overrides when the tag stops always showing as a segment", async () => {
    mocks.tagsUpdate.mockResolvedValue({});
    renderTag({ showAsSegment: true, segmentColorOverride: "#abcabc", segmentLaneOverride: 2 });

    fireEvent.change(screen.getByDisplayValue("Always - force visible on the player bar"), {
      target: { value: "default" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await sentBody()).toEqual({ clearFields: ["showAsSegment", "segmentColorOverride", "segmentLaneOverride"] });
  });

  it("sets the player bar mode to never without touching other display settings", async () => {
    mocks.tagsUpdate.mockResolvedValue({});
    renderTag({ showAsSegment: null, color: "#ff0000", minOccurrenceSec: 5 });

    fireEvent.change(screen.getByDisplayValue("Default - follow display profiles"), { target: { value: "never" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await sentBody()).toEqual({ showAsSegment: false });
  });
});

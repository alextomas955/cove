import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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

  it("sends changed fields plus the display settings the endpoint always writes", async () => {
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

    expect(mocks.tagsUpdate).toHaveBeenCalledWith(1, {
      name: "Renamed",
      color: "#ff0000",
      tagGroupId: 3,
      minOccurrenceSec: null,
      minOccurrencePercent: null,
      showAsSegment: null,
      segmentColorOverride: null,
      segmentLaneOverride: null,
    });
  });
});

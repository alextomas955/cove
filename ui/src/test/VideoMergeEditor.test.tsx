import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VideoMergeEditor, buildVideoMergeDiff, videoMergeMetadata } from "../components/VideoMergeEditor";
import { defaultDiffSelection } from "../components/MetadataDiff";
import type { Video } from "../api/types";

const api = vi.hoisted(() => ({ get: vi.fn(), merge: vi.fn(), findTags: vi.fn() }));
vi.mock("../api/client", () => ({
  videos: { get: api.get, merge: api.merge, screenshotUrl: (id: number) => `/cover/${id}` },
  tags: { find: api.findTags },
}));
const video = (id: number): Video => ({
  id,
  title: `Title ${id}`,
  details: `Description ${id}`,
  organized: false,
  urls: [],
  tags: [],
  performers: [],
  files: [],
  galleries: [],
  remoteIds: [],
  groups: [],
  createdAt: "",
  updatedAt: "",
});
function setup(targetId = 2) {
  const onClose = vi.fn(),
    onMerged = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <VideoMergeEditor sourceId={1} targetId={targetId} onClose={onClose} onMerged={onMerged} />
    </QueryClientProvider>,
  );
  return { ...view, onClose, onMerged };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (id: number) => video(id));
  api.merge.mockResolvedValue(video(2));
  api.findTags.mockResolvedValue({ items: [{ id: 9, name: "Added tag" }] });
});
describe("VideoMergeEditor", () => {
  it("labels remote IDs with configured server names without changing merge identity", () => {
    const source = {
      ...video(1),
      remoteIds: [{ endpoint: "https://metadata.example/graphql/", remoteId: "source-id" }],
    };
    const target = {
      ...video(2),
      remoteIds: [{ endpoint: "https://www.other.example/graphql", remoteId: "target-id" }],
    };
    const diff = buildVideoMergeDiff(source, target, [], undefined, [
      { endpoint: "https://metadata.example/graphql", name: "Example catalog" },
    ]);
    const field = diff.fields.find((field) => field.key === "remoteIds")!;
    expect(field.render!(source.remoteIds[0])).toBe("Example catalog\nsource-id");
    expect(field.itemLabel!(source.remoteIds[0])).toBe("Example catalog: source-id");
    expect(field.render!(target.remoteIds[0])).toBe("other.example\ntarget-id");
    const selection = defaultDiffSelection(diff.fields, diff.source, diff.target);
    expect(videoMergeMetadata(selection, source, target).remoteIds).toEqual(
      expect.arrayContaining([...source.remoteIds, ...target.remoteIds]),
    );
  });
  it("saves mixed choices and a library tag in a single merge request", async () => {
    const { onMerged } = setup();
    fireEvent.click(await screen.findByLabelText("Title from source"));
    fireEvent.change(screen.getByPlaceholderText("Search tags…"), { target: { value: "Added" } });
    fireEvent.click(await screen.findByRole("button", { name: "Added tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Tags: Added tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Tags: Added tag" }));
    expect(screen.getByRole("button", { name: "Remove Tags: Added tag" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Merge into kept video" }));
    await waitFor(() => expect(onMerged).toHaveBeenCalledWith(2));
    expect(api.merge).toHaveBeenCalledWith(
      2,
      [1],
      expect.objectContaining({ tagIds: [9], fields: expect.objectContaining({ title: "source", details: "target" }) }),
    );
  });
  it("cancels without saving and initializes a new comparison with target defaults", async () => {
    const first = setup();
    fireEvent.click(await screen.findByLabelText("Title from source"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(first.onClose).toHaveBeenCalled();
    expect(api.merge).not.toHaveBeenCalled();
    first.unmount();
    setup(3);
    expect(await screen.findByLabelText("Title from target")).toBeChecked();
  });
  it("keeps the cover row visible and falls back after a source preview fails", async () => {
    setup();
    fireEvent.click(await screen.findByLabelText("Cover from source"));
    fireEvent.error(screen.getAllByAltText("Video cover").find((image) => image.getAttribute("src") === "/cover/1")!);
    expect(screen.getByLabelText("Cover from source")).toBeDisabled();
    fireEvent.error(screen.getAllByAltText("Video cover").find((image) => image.getAttribute("src") === "/cover/2")!);
    expect(screen.getByRole("group", { name: /Cover/ })).toBeInTheDocument();
    expect(screen.getAllByText("No cover available").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Merge into kept video" }));
    await waitFor(() =>
      expect(api.merge).toHaveBeenCalledWith(
        2,
        [1],
        expect.objectContaining({ fields: expect.objectContaining({ cover: "target" }) }),
      ),
    );
  });
  it("keeps derived tags read-only instead of promoting them into editable links", async () => {
    api.get.mockImplementation(async (id: number) => ({
      ...video(id),
      tags: [{ id: id + 10, name: "Derived " + id, canRemove: false }],
    }));
    setup();
    await screen.findByLabelText("Title from target");
    expect(screen.getByLabelText("Derived tags from source")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Merge into kept video" }));
    await waitFor(() => expect(api.merge).toHaveBeenCalledWith(2, [1], expect.objectContaining({ tagIds: [] })));
  });
  it("keeps the draft after a failed save", async () => {
    api.merge.mockRejectedValue(new Error("Merge failed"));
    setup();
    fireEvent.click(await screen.findByLabelText("Title from source"));
    fireEvent.click(screen.getByRole("button", { name: "Merge into kept video" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Title from source")).toBeChecked();
  });
});

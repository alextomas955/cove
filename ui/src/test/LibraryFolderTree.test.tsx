import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryFolder } from "../api/client";
import { LibraryFolderTree } from "../components/LibraryFolderTree";

const { libraryFolders, filesystemPolicy } = vi.hoisted(() => ({
  libraryFolders: vi.fn(),
  filesystemPolicy: vi.fn(),
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, metadata: { ...actual.metadata, libraryFolders, filesystemPolicy } };
});

const folder = (path: string, hasChildren = true): LibraryFolder => ({
  name: path.slice(path.lastIndexOf("/") + 1) || path,
  path,
  hasChildren,
});

const TREE: Record<string, LibraryFolder[]> = {
  "/media": [folder("/media/a"), folder("/media/ab")],
  "/media/a": [folder("/media/a/b"), folder("/media/a/c")],
  "/media/a/b": [folder("/media/a/b/leaf", false)],
  "/media/ab": [folder("/media/ab/x", false)],
  "/media/a/c": [folder("/media/a/c/y", false)],
  "/other": [folder("/other/z", false)],
};

function renderTree(selected: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = (next: string[]) => (
    <QueryClientProvider client={client}>
      <LibraryFolderTree
        roots={[
          { name: "/media", path: "/media", hasChildren: true },
          { name: "/other", path: "/other", hasChildren: true },
        ]}
        selected={next}
        onToggle={vi.fn()}
        selectionMode="single"
        probeChildren={false}
        emptyHint="none"
      />
    </QueryClientProvider>
  );
  const result = render(view(selected));
  return { ...result, rerenderWith: (next: string[]) => result.rerender(view(next)) };
}

describe("LibraryFolderTree auto-expansion", () => {
  beforeEach(() => {
    libraryFolders.mockReset();
    libraryFolders.mockImplementation((path?: string) => Promise.resolve(TREE[path ?? ""] ?? []));
    filesystemPolicy.mockReset();
    filesystemPolicy.mockResolvedValue({ caseSensitive: true });
  });

  it("expands only the ancestors of a selected nested folder", async () => {
    renderTree(["/media/a/b/leaf"]);

    expect(await screen.findByRole("radio", { name: "leaf" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Collapse folder /media" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse folder a" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse folder b" })).toBeInTheDocument();
    // Siblings, a prefix look-alike and unrelated roots stay collapsed and are never fetched.
    expect(screen.getByRole("button", { name: "Expand folder ab" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand folder c" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand folder /other" })).toBeInTheDocument();
    expect(libraryFolders.mock.calls.map(([path]) => path).sort()).toEqual(["/media", "/media/a", "/media/a/b"]);
    expect(libraryFolders).toHaveBeenCalledWith("/media/a/b", false);
  });

  it("does not expand the selected folder itself or anything when nothing is selected", async () => {
    const { unmount } = renderTree([]);
    expect(screen.getByRole("button", { name: "Expand folder /media" })).toBeInTheDocument();
    expect(libraryFolders).not.toHaveBeenCalled();
    expect(filesystemPolicy).not.toHaveBeenCalled();
    unmount();

    renderTree(["/media"]);
    expect(screen.getByRole("radio", { name: "/media" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Expand folder /media" })).toBeInTheDocument();
  });

  it("matches the selection with the server's case policy", async () => {
    filesystemPolicy.mockResolvedValue({ caseSensitive: false });
    renderTree(["/MEDIA/A/B/LEAF"]);

    expect(await screen.findByRole("button", { name: "Collapse folder b" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand folder ab" })).toBeInTheDocument();
  });

  it("keeps a manual collapse and re-expands when the selection moves beneath the node again", async () => {
    const { rerenderWith } = renderTree(["/media/a/b/leaf"]);
    await screen.findByRole("radio", { name: "leaf" });

    await userEvent.click(screen.getByRole("button", { name: "Collapse folder a" }));
    expect(screen.getByRole("button", { name: "Expand folder a" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "leaf" })).not.toBeInTheDocument();

    rerenderWith(["/media/ab/x"]);
    expect(await screen.findByRole("radio", { name: "x" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Expand folder a" })).toBeInTheDocument();

    rerenderWith(["/media/a/c/y"]);
    expect(await screen.findByRole("radio", { name: "y" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Collapse folder a" })).toBeInTheDocument();
  });
});

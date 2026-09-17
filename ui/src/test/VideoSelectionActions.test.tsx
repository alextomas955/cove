import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomFieldDefinition } from "../api/types";
import { VideoSelectionActions } from "../components/VideoSelectionActions";

const mocks = vi.hoisted(() => ({
  bulkUpdate: vi.fn(),
  customFieldsList: vi.fn(),
}));

vi.mock("../api/client", () => ({
  videos: { bulkUpdate: mocks.bulkUpdate, bulkDelete: vi.fn() },
  customFields: { list: mocks.customFieldsList },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: { ui: { continuePlaylistDefault: false } } }),
  useOptionalAppConfig: () => ({ config: { ui: { continuePlaylistDefault: false } } }),
}));

vi.mock("../state/VideoQueueContext", () => ({
  useVideoQueue: () => ({ setQueue: vi.fn() }),
}));

vi.mock("../components/ExtensionSelectionActions", () => ({
  ExtensionSelectionActions: () => null,
}));

const definition: CustomFieldDefinition = {
  key: "review_status",
  label: "Review status",
  type: "text",
  entityTypes: ["video"],
  options: [],
  filterable: false,
  sortable: false,
  isMultiValue: false,
};

describe("VideoSelectionActions bulk edit", () => {
  beforeEach(() => {
    mocks.bulkUpdate.mockReset();
    mocks.customFieldsList.mockReset();
  });

  it("sends the selected ids with custom field values and mode in one request", async () => {
    mocks.customFieldsList.mockResolvedValue([definition]);
    mocks.bulkUpdate.mockResolvedValue(undefined);
    const onSelectNone = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <VideoSelectionActions
          items={[]}
          selectedIds={new Set([4, 9])}
          onSelectNone={onSelectNone}
          onNavigate={vi.fn()}
          queryKey="videos"
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const section = within(await screen.findByRole("group", { name: "Custom fields" }));
    await user.click(section.getByRole("button", { name: /Custom fields/ }));
    await user.click(section.getByRole("checkbox", { name: /Review status/ }));
    await user.click(section.getByRole("radio", { name: "Overwrite" }));
    await user.type(section.getByRole("textbox", { name: "Review status" }), "done");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(onSelectNone).toHaveBeenCalledOnce());
    expect(mocks.bulkUpdate).toHaveBeenCalledWith({
      ids: [4, 9],
      customFields: { review_status: "done" },
      customFieldMode: "SET",
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["videos"] });
  });

  it("forgets a cleared field when the dialog is cancelled and reopened", async () => {
    mocks.customFieldsList.mockResolvedValue([definition]);
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <VideoSelectionActions items={[]} selectedIds={new Set([4])} onSelectNone={vi.fn()} onNavigate={vi.fn()} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    let section = within(await screen.findByRole("group", { name: "Custom fields" }));
    await user.click(section.getByRole("button", { name: /Custom fields/ }));
    await user.click(section.getByRole("checkbox", { name: /Review status/ }));
    await user.click(section.getByRole("button", { name: "Clear value for Review status" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Edit" }));
    section = within(await screen.findByRole("group", { name: "Custom fields" }));
    expect(section.getByRole("button", { name: /Custom fields/ })).toHaveAttribute("aria-expanded", "false");
    await user.click(section.getByRole("button", { name: /Custom fields/ }));
    expect(section.getByRole("checkbox", { name: /Review status/ })).not.toBeChecked();
    expect(section.queryByRole("button", { name: "Clear value for Review status" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });
});

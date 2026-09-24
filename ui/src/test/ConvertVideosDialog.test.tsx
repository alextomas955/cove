import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConvertVideosDialog } from "../components/ConvertVideosDialog";

const mocks = vi.hoisted(() => ({
  encoders: vi.fn(),
  start: vi.fn(),
}));

vi.mock("../api/client", () => ({
  videoConversion: { encoders: mocks.encoders, start: mocks.start },
}));

function renderDialog(props: Partial<Parameters<typeof ConvertVideosDialog>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConvertVideosDialog open onClose={vi.fn()} videoIds={[3, 7]} canReplaceOriginals {...props} />
    </QueryClientProvider>,
  );
}

// The test environment has no working localStorage; the dialog remembers its options there.
function stubStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    clear: () => values.clear(),
  };
  vi.stubGlobal("localStorage", storage);
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
}

describe("ConvertVideosDialog", () => {
  beforeEach(() => {
    stubStorage();
    mocks.encoders.mockReset();
    mocks.start.mockReset();
    mocks.encoders.mockResolvedValue([
      { codec: "h264", encoder: "h264_nvenc", hardware: true },
      { codec: "hevc", encoder: "hevc_nvenc", hardware: true },
      { codec: "av1", encoder: null, hardware: false },
    ]);
  });

  it("starts a job for the selected videos with the chosen options", async () => {
    mocks.start.mockResolvedValue({ jobId: "job-1", itemCount: 2 });
    const onStarted = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onStarted });

    expect(await screen.findByText(/GPU encoding with hevc_nvenc/)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Container"), "mkv");
    await user.selectOptions(screen.getByLabelText("Quality"), "highSoftware");
    await user.click(screen.getByRole("checkbox", { name: /Replace the originals/ }));
    await user.click(screen.getByRole("button", { name: "Convert and replace" }));

    await waitFor(() => expect(onStarted).toHaveBeenCalledOnce());
    expect(mocks.start).toHaveBeenCalledWith({
      videoIds: [3, 7],
      codec: "hevc",
      container: "mkv",
      effort: "highSoftware",
      outputFrameRate: null,
      convertMarginalSavings: false,
      replaceOriginal: true,
      convertEvenIfLarger: false,
    });
    expect(await screen.findByText("Conversion job queued")).toBeTruthy();
  });

  it("never remembers replacing originals for the next conversion", async () => {
    mocks.start.mockResolvedValue({ jobId: "job-1", itemCount: 2 });
    const user = userEvent.setup();
    const { unmount } = renderDialog();

    await user.click(screen.getByRole("checkbox", { name: /Replace the originals/ }));
    await user.click(screen.getByRole("button", { name: "Convert and replace" }));
    await screen.findByText("Conversion job queued");
    unmount();

    renderDialog();
    expect((screen.getByRole("checkbox", { name: /Replace the originals/ }) as HTMLInputElement).checked).toBe(false);
  });

  it("hides replacing originals from viewers who cannot delete files", () => {
    renderDialog({ canReplaceOriginals: false });

    expect(screen.queryByRole("checkbox", { name: /Replace the originals/ })).toBeNull();
  });

  it("blocks a codec this ffmpeg cannot encode", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.selectOptions(screen.getByLabelText("Video codec"), "av1");

    expect(await screen.findByText(/cannot encode AV1/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Convert" }) as HTMLButtonElement).disabled).toBe(true);
  });

  // A stored choice outlives the option that produced it. When a later build renames or retires an
  // effort, replaying the old value put it straight into the request and the API rejected the whole
  // thing with a 400, leaving conversion unusable until browser storage was cleared by hand.
  it("ignores a stored option this build no longer offers", async () => {
    localStorage.setItem(
      "cove.convert-videos.options",
      JSON.stringify({ codec: "hevc", container: "mp4", effort: "qualitySoftware" }),
    );

    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /^convert$/i }));

    await waitFor(() => expect(mocks.start).toHaveBeenCalled());
    const sent = mocks.start.mock.calls[0][0];
    expect(["highSoftware", "highHardware", "balancedSoftware", "balancedHardware"]).toContain(sent.effort);
  });

  it("keeps a stored option this build still offers", async () => {
    localStorage.setItem(
      "cove.convert-videos.options",
      JSON.stringify({ codec: "hevc", container: "mkv", effort: "balancedHardware" }),
    );

    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /^convert$/i }));

    await waitFor(() => expect(mocks.start).toHaveBeenCalled());
    const sent = mocks.start.mock.calls[0][0];
    expect(sent.effort).toBe("balancedHardware");
    expect(sent.container).toBe("mkv");
  });

  it("discards stored junk rather than sending it", async () => {
    localStorage.setItem(
      "cove.convert-videos.options",
      JSON.stringify({ codec: 42, container: null, effort: {}, outputFrameRate: "sixty" }),
    );

    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /^convert$/i }));

    await waitFor(() => expect(mocks.start).toHaveBeenCalled());
    const sent = mocks.start.mock.calls[0][0];
    expect(["h264", "hevc", "av1", "copy"]).toContain(sent.codec);
    expect(["mp4", "mkv"]).toContain(sent.container);
    expect(["highSoftware", "highHardware", "balancedSoftware", "balancedHardware"]).toContain(sent.effort);
    expect(sent.outputFrameRate).toBeNull();
  });
});

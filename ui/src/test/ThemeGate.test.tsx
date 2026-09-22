import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ loaded: false }));
vi.mock("../extensions/ExtensionLoader", () => ({ useExtensions: () => ({ loaded: state.loaded }) }));

async function renderGate() {
  // The gate reads the painted state once, at module scope, so set the DOM up before importing.
  vi.resetModules();
  const { ThemeGate } = await import("../components/ThemeGate");
  return render(
    <ThemeGate>
      <div data-testid="app">app</div>
    </ThemeGate>,
  );
}

function paintBootedLook() {
  const style = document.createElement("style");
  style.id = "cove-theme-override";
  style.setAttribute("data-cove-boot", "1");
  document.head.appendChild(style);
}

describe("ThemeGate", () => {
  beforeEach(() => {
    state.loaded = false;
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    document.getElementById("cove-theme-override")?.remove();
  });

  // First sign-in on a new browser: nothing cached, so the palette is genuinely unknown.
  it("holds the app back while the theme is still unknown", async () => {
    await renderGate();

    expect(screen.queryByTestId("app")).toBeNull();
  });

  it("releases the app once the extension manifest settles", async () => {
    state.loaded = true;
    await renderGate();

    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  // A repeat visit is already painted, so waiting would delay the app for nothing.
  it("does not wait when the boot script already painted the user's theme", async () => {
    paintBootedLook();
    await renderGate();

    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("gives up waiting rather than holding the app hostage to a hung manifest", async () => {
    vi.useFakeTimers();
    try {
      await renderGate();
      expect(screen.queryByTestId("app")).toBeNull();

      await vi.advanceTimersByTimeAsync(2000);
    } finally {
      vi.useRealTimers();
    }

    await waitFor(() => expect(screen.getByTestId("app")).toBeInTheDocument());
  });
});

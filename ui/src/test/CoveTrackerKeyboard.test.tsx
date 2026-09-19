import { useMemo } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { KeyboardShortcutProvider } from "../keyboard/KeyboardShortcutProvider";
import { useRegisterExtensionKeyboardActions } from "../hooks/useRegisterKeyboardActionHandler";
import { pushOverlay } from "../utils/overlayState";

const handler = vi.fn();
vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ user: null, hasPermission: () => true }) }));
vi.mock("../state/AppConfigContext", () => ({ useAppConfig: () => ({ config: { ui: {} } }) }));
vi.mock("../utils/userUiPreferences", () => ({ updateAuthenticatedUserUiPreferences: vi.fn() }));
vi.mock("../extensions/ExtensionLoader", () => ({
  useExtensions: () => ({
    manifest: {
      keyboardActions: [
        {
          id: "extension:cove.community.aidome:tracker-edge",
          extensionId: "cove.community.aidome",
          label: "Record edge",
          defaultBindings: ["Alt+E"],
          scopes: [{ surface: "global" }, { surface: "overlay" }],
          repeatable: false,
          allowInEditable: false,
        },
      ],
      keyboardShortcutPresets: [],
    },
  }),
}));

function Companion() {
  const actions = useMemo(() => [{ id: "tracker-edge", surface: "overlay" as const, action: handler }], []);
  useRegisterExtensionKeyboardActions("cove.community.aidome", actions);
  return <input aria-label="Editor" />;
}

beforeEach(() => {
  localStorage.clear();
  handler.mockClear();
});
afterEach(cleanup);
describe("Cove tracker keyboard integration", () => {
  it("dispatches the manifest default through the native controller while a lightbox owns the keyboard", () => {
    render(
      <KeyboardShortcutProvider>
        <Companion />
      </KeyboardShortcutProvider>,
    );
    const release = pushOverlay();
    try {
      fireEvent.keyDown(window, { key: "e", altKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      release();
    }
  });
  it("suppresses typing targets and auto repeat", () => {
    const result = render(
      <KeyboardShortcutProvider>
        <Companion />
      </KeyboardShortcutProvider>,
    );
    fireEvent.keyDown(result.getByRole("textbox"), { key: "e", altKey: true });
    fireEvent.keyDown(window, { key: "e", altKey: true, repeat: true });
    expect(handler).not.toHaveBeenCalled();
  });
  it("uses a changed Cove binding rather than the original default", () => {
    localStorage.setItem(
      "cove-keyboard-shortcut-preferences-v1",
      JSON.stringify({
        activePresetId: "user:tracker",
        personalPresets: [
          {
            schemaVersion: 1,
            id: "user:tracker",
            name: "Tracker",
            basePresetId: "cove:native",
            unmappedActions: "action-defaults",
            bindings: { "extension:cove.community.aidome:tracker-edge": ["Alt+J"] },
          },
        ],
      }),
    );
    render(
      <KeyboardShortcutProvider>
        <Companion />
      </KeyboardShortcutProvider>,
    );
    fireEvent.keyDown(window, { key: "j", altKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "e", altKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

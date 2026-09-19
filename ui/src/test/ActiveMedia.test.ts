import { afterEach, describe, expect, it } from "vitest";
import { getActiveMedia, registerActiveMedia } from "../components/ActiveMedia";

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
});
function register(id: number, priority: number, kind: "image" | "video" = "image") {
  cleanup.push(registerActiveMedia(Symbol(), { kind, id, surface: "detail" }, priority));
}
describe("active media attribution", () => {
  it("prefers the lightbox over the underlying detail and restores it on close", () => {
    register(1, 10);
    const close = registerActiveMedia(Symbol(), { kind: "image", id: 2, surface: "lightbox" }, 30);
    expect(getActiveMedia()?.id).toBe(2);
    close();
    expect(getActiveMedia()?.id).toBe(1);
  });
  it("does not choose between equally authoritative different items", () => {
    register(1, 10);
    register(2, 10, "video");
    expect(getActiveMedia()).toBeNull();
  });
  it("blocks attribution to the page while a lightbox replacement is loading", () => {
    register(1, 10);
    cleanup.push(registerActiveMedia(Symbol(), null, 30));
    expect(getActiveMedia()).toBeNull();
  });
  it("removes stale media when a viewer unmounts", () => {
    const close = registerActiveMedia(
      Symbol(),
      { kind: "video", id: 3, surface: "quick-view", positionSeconds: 42 },
      20,
    );
    expect(getActiveMedia()?.positionSeconds).toBe(42);
    close();
    expect(getActiveMedia()).toBeNull();
  });
});

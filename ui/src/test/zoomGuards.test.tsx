import { afterEach, describe, expect, it, vi } from "vitest";
import { installZoomGuards, markActivationClickHandled, resetViewportZoom, VIEWPORT_LOCK } from "../zoomGuards";

function clickOn(element: Element): MouseEvent {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
}

function createGuardedDocument(html: string, scale = 1) {
  const doc = document.implementation.createHTMLDocument("guarded");
  doc.body.innerHTML = html;
  doc.head.innerHTML = `<meta name="viewport" content="${VIEWPORT_LOCK}" />`;
  const listeners: Record<string, () => void> = {};
  const visualViewport = {
    scale,
    addEventListener: (type: string, listener: () => void) => {
      listeners[type] = listener;
    },
  };
  const frames: FrameRequestCallback[] = [];
  const win = {
    visualViewport,
    requestAnimationFrame: (cb: FrameRequestCallback) => frames.push(cb),
  } as unknown as Window;
  installZoomGuards(doc, win);
  const runFrames = () => {
    while (frames.length) frames.shift()!(0);
  };
  return { doc, visualViewport, listeners, frames, runFrames };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

describe("markActivationClickHandled", () => {
  it.each([
    ["a type=button button", `<button type="button">Next page</button>`, "button", true],
    ["an untyped button outside a form", `<button>Filters</button>`, "button", true],
    ["a type=button button inside a form", `<form><button type="button">Cancel</button></form>`, "button", true],
    ["an icon inside a button", `<button type="button"><svg><path /></svg></button>`, "path", true],
    ["an element with role=button", `<div role="button" tabindex="0">Card</div>`, "div", true],
    ["a submit button inside a form", `<form><button>Save</button></form>`, "button", false],
    ["a link with role=button", `<a role="button" href="/x">Go</a>`, "a", false],
    ["a role=button inside a link", `<a href="/x"><span role="button">Go</span></a>`, "span", false],
    ["a label with role=button", `<label role="button"><input type="checkbox" /></label>`, "label", false],
    ["a checkbox inside a role=button wrapper", `<div role="button"><input type="checkbox" /></div>`, "input", false],
    ["a plain div", `<div>text</div>`, "div", false],
  ])("marks clicks on %s handled: %s", (_label, html, selector, expectedPrevented) => {
    document.body.innerHTML = html;
    document.addEventListener("click", markActivationClickHandled, { once: true, capture: true });
    const target = document.querySelector(selector);
    if (!target) throw new Error(`missing ${selector}`);

    expect(clickOn(target).defaultPrevented).toBe(expectedPrevented);
  });

  it("does not interfere with a form that a button belongs to via the form attribute", () => {
    document.body.innerHTML = `<form id="f"></form><button form="f">Submit elsewhere</button>`;
    document.addEventListener("click", markActivationClickHandled, { once: true, capture: true });

    expect(clickOn(document.querySelector("button")!).defaultPrevented).toBe(false);
  });

  it("still marks a click handled when the button's own handler stops propagation", () => {
    const { doc } = createGuardedDocument(`<button type="button">Favourite</button>`);
    const button = doc.querySelector("button")!;
    let preventedAtTarget: boolean | undefined;
    button.addEventListener("click", (event) => {
      preventedAtTarget = event.defaultPrevented;
      event.stopPropagation();
    });

    clickOn(button);

    expect(preventedAtTarget).toBe(true);
  });
});

describe("resetViewportZoom", () => {
  it("changes the viewport arguments before restoring the zoom lock so WebKit re-applies the initial scale", () => {
    document.head.innerHTML = `<meta name="viewport" content="${VIEWPORT_LOCK}" />`;
    const meta = document.querySelector('meta[name="viewport"]')!;
    const frames: FrameRequestCallback[] = [];
    const win = { requestAnimationFrame: (cb: FrameRequestCallback) => frames.push(cb) } as unknown as Window;
    const onDone = vi.fn();

    resetViewportZoom(document, win, onDone);

    expect(meta.getAttribute("content")).not.toBe(VIEWPORT_LOCK);
    expect(meta.getAttribute("content")).toContain("maximum-scale=1.0");
    expect(onDone).not.toHaveBeenCalled();

    frames[0](0);

    expect(meta.getAttribute("content")).toBe(VIEWPORT_LOCK);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("installZoomGuards", () => {
  it("resets only when the visual viewport reports a zoomed scale, once per cycle", () => {
    const { doc, visualViewport, listeners, frames, runFrames } = createGuardedDocument("");
    const meta = doc.querySelector('meta[name="viewport"]')!;
    const setAttribute = vi.spyOn(meta, "setAttribute");

    listeners.resize();
    runFrames();
    expect(setAttribute).not.toHaveBeenCalled();

    visualViewport.scale = 2;
    listeners.resize();
    listeners.scroll();
    expect(frames).toHaveLength(1);
    runFrames();

    expect(setAttribute).toHaveBeenCalledTimes(2);
    expect(meta.getAttribute("content")).toBe(VIEWPORT_LOCK);

    listeners.scroll();
    runFrames();
    expect(setAttribute).toHaveBeenCalledTimes(4);
  });

  it("blocks multi-touch gestures at normal scale but lets a zoomed page be pinched back out", () => {
    const { doc, visualViewport } = createGuardedDocument("<div>content</div>");
    const twoFingerTouch = () => {
      const event = new Event("touchstart", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: [{}, {}] });
      doc.body.dispatchEvent(event);
      return event;
    };
    const gesture = () => {
      const event = new Event("gesturestart", { bubbles: true, cancelable: true });
      doc.body.dispatchEvent(event);
      return event;
    };

    expect(twoFingerTouch().defaultPrevented).toBe(true);
    expect(gesture().defaultPrevented).toBe(true);

    visualViewport.scale = 2;

    expect(twoFingerTouch().defaultPrevented).toBe(false);
    expect(gesture().defaultPrevented).toBe(false);
  });
});

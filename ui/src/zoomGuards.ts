// Cove disables page zoom. The viewport meta alone is not enough on iOS, where Safari forces pages
// to stay pinch-scalable and applies its own zoom gestures, so these guards cover the remaining ways
// the page can still end up zoomed. Keep the arguments in sync with the viewport meta in index.html.
const VIEWPORT_ARGUMENTS = ["width=device-width", "initial-scale=1.0", "minimum-scale=1.0", "maximum-scale=1.0"];
export const VIEWPORT_LOCK = [...VIEWPORT_ARGUMENTS, "user-scalable=no"].join(", ");
// WebKit only re-applies the initial scale when the parsed viewport arguments actually change, so a
// reset briefly switches one argument before restoring the lock. This is best effort: it relies on
// WebKit's zoom-to-initial-scale branch when the viewport changes.
const VIEWPORT_RESET = [...VIEWPORT_ARGUMENTS, "user-scalable=yes"].join(", ");

const DEFAULT_ACTION_CONTROLS = "a, input, label, select, summary, textarea";
const ZOOMED_SCALE = 1.01;

// Safari on iOS treats a tap as "not handled as a click" unless the mousedown or click event ended
// up default-prevented or default-handled. A fast second tap is recognised by its non-blocking
// double-tap recogniser, and an unhandled tap then triggers smart magnification, which ignores
// maximum-scale=1 because Safari forces pages to be scalable. WebKit never marks a click on a button
// without a default action as handled, so mark such clicks handled here. WebKit inspects the event
// after dispatch, so this runs in the capture phase, where a handler that stops propagation cannot
// bypass it.
export function markActivationClickHandled(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const control = target.closest("button, [role='button']");
  if (!control) return;
  // Anything with a default action, above or below the control, keeps it.
  if (target.closest(DEFAULT_ACTION_CONTROLS)) return;
  if (control instanceof HTMLButtonElement && control.form && control.type !== "button") return;
  event.preventDefault();
}

export function resetViewportZoom(doc: Document, win: Window, onDone?: () => void): void {
  const viewport = doc.querySelector('meta[name="viewport"]');
  if (!viewport) {
    onDone?.();
    return;
  }
  viewport.setAttribute("content", VIEWPORT_RESET);
  win.requestAnimationFrame(() => {
    viewport.setAttribute("content", VIEWPORT_LOCK);
    onDone?.();
  });
}

export function installZoomGuards(doc: Document = document, win: Window = window): void {
  // Once the page is zoomed anyway, multi-touch gestures stay allowed so the user can pinch back out.
  const isZoomed = () => (win.visualViewport?.scale ?? 1) > ZOOMED_SCALE;
  // Prevent pinch-to-zoom on iOS (viewport meta alone is insufficient since iOS 10+)
  // Use capture phase so we intercept before the browser processes the gesture
  const preventGesture = (e: Event) => {
    if (!isZoomed()) e.preventDefault();
  };
  doc.addEventListener("gesturestart", preventGesture, { passive: false, capture: true });
  doc.addEventListener("gesturechange", preventGesture, { passive: false, capture: true });
  doc.addEventListener("gestureend", preventGesture, { passive: false, capture: true });
  // Prevent multi-touch zoom on all platforms — including during active scroll.
  // touchstart: block new touches when a second finger lands (prevents zoom initiation mid-scroll)
  // touchmove: block multi-touch moves that slipped past touchstart
  const preventMultiTouch = (e: TouchEvent) => {
    if (e.touches.length > 1 && !isZoomed()) e.preventDefault();
  };
  doc.addEventListener("touchstart", preventMultiTouch, { passive: false, capture: true });
  doc.addEventListener("touchmove", preventMultiTouch, { passive: false, capture: true });
  doc.addEventListener("click", markActivationClickHandled, { capture: true });
  // Safari fallback: monitor the viewport scale and reset it if the page still got zoomed, for
  // example by a double-tap that Safari did not attribute to a click.
  const visualViewport = win.visualViewport;
  if (visualViewport) {
    let resetPending = false;
    const resetZoom = () => {
      if (!isZoomed() || resetPending) return;
      resetPending = true;
      win.requestAnimationFrame(() => {
        resetViewportZoom(doc, win, () => {
          resetPending = false;
        });
      });
    };
    visualViewport.addEventListener("resize", resetZoom);
    visualViewport.addEventListener("scroll", resetZoom);
  }
}

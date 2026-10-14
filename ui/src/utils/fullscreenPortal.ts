/**
 * The fullscreen element that contains `anchor`, if any. Only that element's subtree is painted while it
 * is fullscreen, so a popup anchored inside it must be portalled there rather than to `document.body`.
 */
export function fullscreenContainerFor(anchor: Element | null): HTMLElement | null {
  const fullscreenElement = typeof document === "undefined" ? null : document.fullscreenElement;
  return fullscreenElement instanceof HTMLElement && anchor && fullscreenElement.contains(anchor)
    ? fullscreenElement
    : null;
}

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * Docks a list's selection bar at the bottom of the screen on layouts where the toolbar is not pinned (phones and
 * tablets), once the bar has scrolled up under the navbar while items are selected.
 *
 * - The caller renders the bar inside `anchorRef`, which stays in normal flow, and switches the bar itself to a fixed
 *   bottom dock while `docked`. The same element moves, so the selection actions and any dialogs they own keep their
 *   state.
 * - While docked, the caller holds `anchorRef` at `anchorHeight`, measured while the bar was inline and known before
 *   the docked render commits, so the content below does not move. Docking is decided from the anchor's position,
 *   which docking never changes. If the bar's natural height changed while docked (more actions, a rotated phone),
 *   undocking scrolls by the difference so the content in view stays put.
 * - `dockHeight` is the docked bar's height, for a spacer that keeps the last rows and the bottom pager reachable. It
 *   must be a trailing element: padding on an ancestor of the list would switch off the browser's scroll anchoring in
 *   the frame the selection clears, and the content would jump by the anchor's height.
 * - A toolbar that is pinned (`position: sticky`, the desktop layout) keeps its selection bar in the pinned toolbar
 *   instead.
 */
export function useDockingSelectionBar({
  active,
  navHeight,
  toolbarRef,
}: {
  /** Items are selected and the list scrolls the document. */
  active: boolean;
  navHeight: number;
  toolbarRef: RefObject<HTMLElement | null>;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const heldHeightRef = useRef(0);
  const [docked, setDocked] = useState(false);
  const [anchorHeight, setAnchorHeight] = useState(0);
  const [dockHeight, setDockHeight] = useState(0);

  // A layout effect, so a new selection is evaluated before its bar paints.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const toolbar = toolbarRef.current;
    if (!active || !anchor || !toolbar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setDocked(getComputedStyle(toolbar).position !== "sticky" && anchor.getBoundingClientRect().bottom < navHeight);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      // A cleared selection starts the next one inline, where its bar is measured afresh.
      setDocked(false);
    };
  }, [active, navHeight, toolbarRef]);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      // The selection cleared: its bar left the page, so there is no held height to make up for.
      heldHeightRef.current = 0;
      return;
    }
    // While docked the anchor is held at the last inline height, so there is nothing to measure.
    if (docked) return;
    const measure = () => {
      const height = anchor.getBoundingClientRect().height;
      setAnchorHeight(height);
      return height;
    };
    const natural = measure();
    // Undocking released a held height that no longer matches the bar: keep the content in view where it was. A
    // pinned toolbar (the window grew past the breakpoint while docked) already holds its own height, so nothing below
    // it moved.
    const held = heldHeightRef.current;
    heldHeightRef.current = 0;
    const toolbar = toolbarRef.current;
    if (held > 0 && Math.abs(natural - held) >= 1 && toolbar && getComputedStyle(toolbar).position !== "sticky") {
      window.scrollBy({ top: natural - held, behavior: "instant" });
    }
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    return () => observer.disconnect();
    // The anchor only exists while items are selected, so start measuring when it mounts.
  }, [active, docked, toolbarRef]);

  // Track the dock's height for the trailing spacer, and keep keyboard focus clear of the dock.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!docked || !bar) return;
    heldHeightRef.current = anchorHeight;
    const root = document.documentElement;
    const previous = root.style.scrollPaddingBottom;
    const update = () => {
      const height = bar.getBoundingClientRect().height;
      setDockHeight(height);
      root.style.scrollPaddingBottom = `${height + 24}px`;
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(bar);
    return () => {
      observer?.disconnect();
      root.style.scrollPaddingBottom = previous;
    };
  }, [anchorHeight, docked]);

  return { anchorRef, barRef, docked: active && docked, anchorHeight, dockHeight };
}

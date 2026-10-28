import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Marks toolbar regions that the condensed layout hides. */
export const CONDENSE_HIDDEN_ATTRIBUTE = "data-condense-hidden";
/** Marks toolbar regions that only exist in the condensed layout. */
export const CONDENSE_ONLY_ATTRIBUTE = "data-condense-only";

function isDocumentScrolled(element: HTMLElement) {
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    // `hidden` also makes a scroll container, which would hold the sticky toolbar instead of the viewport.
    if (/(auto|scroll|overlay|hidden)/.test(getComputedStyle(parent).overflowY)) return false;
  }
  return true;
}

function hasVisibleFocusIn(region: Element | null) {
  const active = document.activeElement;
  if (!region || !active || !region.contains(active)) return false;
  try {
    return active.matches(":focus-visible");
  } catch {
    return true;
  }
}

/**
 * Reports when a list toolbar that the caller pins under the app navbar has scrolled into its pinned, condensed state.
 *
 * - `pinnable` is false when the toolbar lives in its own scroll container (for example a list embedded in an
 *   extension's panel): only window scrolling pins it, so the caller should leave it in normal flow.
 * - The caller makes `toolbarRef` sticky (at `navHeight`) and puts the visible bar in `barRef` inside it.
 * - The sentinel sits directly above the toolbar in normal flow, so condensing never moves the point that decides it.
 * - While condensed, the caller keeps `toolbarRef` at `expandedHeight`. The height it reserves is known before the
 *   condensed render commits, so no layout read lands between the bar shrinking and the space being reserved; one
 *   would let the browser's scroll anchoring pull a barely scrolled page back to the top. The content below therefore
 *   never moves, including when a selection bar appears while pinned.
 * - Hiding a control must not drop keyboard focus: the toolbar does not condense while keyboard focus is inside a
 *   `CONDENSE_HIDDEN_ATTRIBUTE` region, and focus inside a `CONDENSE_ONLY_ATTRIBUTE` region moves to the list search
 *   before the condensed layout goes away.
 */
export function useCondensingStickyToolbar() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [pinnable, setPinnable] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [condensedState, setCondensed] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(0);
  // A toolbar that stopped being pinnable (its container started scrolling) is never condensed.
  const condensed = pinnable && condensedState;

  // Overflow can be responsive, so re-check whether the document is the scroll container when the viewport changes.
  useLayoutEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const update = () => setPinnable(isDocumentScrolled(sentinel));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useLayoutEffect(() => {
    const nav = document.querySelector<HTMLElement>(".cove-navbar");
    if (!nav) return;
    const update = () => setNavHeight(nav.getBoundingClientRect().height);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const toolbar = toolbarRef.current;
    if (!pinnable || !sentinel || !toolbar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Narrow layouts leave the toolbar in flow (a pinned toolbar would fill a phone screen), so only a toolbar that
      // is actually sticky condenses. One pixel of tolerance keeps fractional navbar heights from condensing an
      // unscrolled page.
      const shouldCondense =
        getComputedStyle(toolbar).position === "sticky" && sentinel.getBoundingClientRect().top < navHeight - 1;
      if (!shouldCondense && toolbar.querySelector(`[${CONDENSE_ONLY_ATTRIBUTE}]`)?.contains(document.activeElement)) {
        toolbar.querySelector<HTMLInputElement>("input[data-list-search='true']")?.focus({ preventScroll: true });
      }
      setCondensed(
        (current) =>
          shouldCondense &&
          (current ||
            !Array.from(toolbar.querySelectorAll(`[${CONDENSE_HIDDEN_ATTRIBUTE}]`)).some((region) =>
              hasVisibleFocusIn(region),
            )),
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    toolbar.addEventListener("focusout", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      toolbar.removeEventListener("focusout", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [navHeight, pinnable]);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    // While condensed the toolbar is held at the last expanded height, so there is nothing to measure.
    if (condensed || !toolbar) return;
    const measure = () => setExpandedHeight(toolbar.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, [condensed]);

  // Keep keyboard focus moving onto cards from ending up underneath the pinned bar.
  useEffect(() => {
    const bar = barRef.current;
    if (!condensed || !bar) return;
    const root = document.documentElement;
    const previous = root.style.scrollPaddingTop;
    const update = () => {
      root.style.scrollPaddingTop = `${navHeight + bar.offsetHeight}px`;
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(bar);
    return () => {
      observer?.disconnect();
      root.style.scrollPaddingTop = previous;
    };
  }, [condensed, navHeight]);

  return { sentinelRef, toolbarRef, barRef, pinnable, navHeight, condensed, expandedHeight };
}

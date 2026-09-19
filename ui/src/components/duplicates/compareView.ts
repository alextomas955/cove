/** Geometry for zooming and panning two copies in lockstep in the duplicate compare view. */

export type Size = { width: number; height: number };

/** Zoom factor over the fitted picture, and the picture's offset from the stage centre in CSS pixels. */
export type View = { zoom: number; x: number; y: number };

export const FIT_VIEW: View = { zoom: 1, x: 0, y: 0 };
export const MAX_ZOOM = 12;

/** Keeps the zoomed picture covering the stage: panning stops at the picture's edges. */
export function clampView(view: View, stage: Size): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, view.zoom));
  const maxX = ((zoom - 1) * stage.width) / 2;
  const maxY = ((zoom - 1) * stage.height) / 2;
  return {
    zoom,
    x: Math.min(maxX, Math.max(-maxX, view.x)),
    y: Math.min(maxY, Math.max(-maxY, view.y)),
  };
}

/** Zooms around a point given relative to the stage centre, so the spot under the cursor stays put. */
export function zoomAround(view: View, zoom: number, point: { x: number; y: number }, stage: Size): View {
  const next = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const ratio = next / view.zoom;
  return clampView(
    { zoom: next, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio },
    stage,
  );
}

/**
 * How much of a copy's own resolution reaches the screen at a zoom: 1 means every source pixel gets a screen
 * pixel. A 4K copy fitted into a dialog sits well below 1, which hides exactly the detail being compared.
 */
export function detailShown(
  natural: Size | undefined,
  stage: Size,
  zoom: number,
  pixelRatio: number,
): number | undefined {
  if (!natural || natural.width <= 0 || natural.height <= 0 || stage.width <= 0 || stage.height <= 0) return undefined;
  const fit = Math.min(stage.width / natural.width, stage.height / natural.height);
  return fit * zoom * pixelRatio;
}

/** The least zoom at which the sharper of the copies gets one screen pixel per source pixel. */
export function nativeZoom(naturals: Array<Size | undefined>, stage: Size, pixelRatio: number): number {
  const needed = naturals
    .map((natural) => detailShown(natural, stage, 1, pixelRatio))
    .filter((shown): shown is number => shown != null && shown > 0)
    .map((shown) => 1 / shown);
  return Math.min(MAX_ZOOM, Math.max(1, ...needed));
}

export function formatDetailShown(shown: number | undefined): string {
  if (shown == null) return "–";
  return shown >= 0.995 ? "full" : `${Math.round(shown * 100)}%`;
}

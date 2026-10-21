/**
 * Decides how many leading navbar items fit inline before the rest move into the "More" menu.
 *
 * `itemWidths` are the rendered widths of every item in display order, `gap` is the flex gap
 * between adjacent items (and between the last inline item and the More button), and
 * `moreButtonWidth` is the width the More button needs once any item overflows. Returns the number
 * of items to render inline; the remainder belong in the overflow menu.
 */
export function countVisibleNavItems(
  itemWidths: readonly number[],
  availableWidth: number,
  moreButtonWidth: number,
  gap = 0,
): number {
  const total = itemWidths.reduce((sum, width, index) => sum + width + (index > 0 ? gap : 0), 0);
  if (total <= availableWidth) return itemWidths.length;

  // Something overflows, so the More button must fit as well.
  let used = moreButtonWidth;
  let visible = 0;
  for (const width of itemWidths) {
    const next = used + gap + width;
    if (next > availableWidth) break;
    used = next;
    visible += 1;
  }
  return visible;
}

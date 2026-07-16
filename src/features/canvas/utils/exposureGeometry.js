// ── Exposure geometry ───────────────────────────────────────────────

// `cea-card-icon-button-container` renders at ≈ 38 px (30 px icon +
// 3 px padding + 1 px border each side). Require the longest exposed
// segment to be at least 2.5 × that so the button has clear breathing
// room past adjacent tiles.
export const PLUS_BUTTON_HEIGHT_PX = 38;
const PLUS_BUTTON_MIN_EDGE_PX = PLUS_BUTTON_HEIGHT_PX * 2.5;

/**
 * Compute right/bottom exposure for every tile in `layout`. Each
 * entry is either `null` (no exposed segment large enough to fit the
 * `+` button — fully interior, or only cramped slivers) or
 * `{ fraction }` — the centre of the largest exposed segment as a
 * 0..1 fraction along the edge. The `+` is positioned at that
 * fraction so it always lands on the exposed strip.
 *
 * `unitToPx`: the lateral measurement is in grid units, so we
 * convert to pixels using the column/row pitch. Pass these through
 * so `PerimeterPlusButtons` doesn't need to know the grid sizing.
 */
export const computeExposure = (layout, { rowPitchPx, colPitchPx }) => {
  const out = {};
  for (const item of layout) {
    out[item.i] = {
      right: pickExposedAnchor(item, layout, 'right', rowPitchPx),
      bottom: pickExposedAnchor(item, layout, 'bottom', colPitchPx),
    };
  }
  return out;
};

const pickExposedAnchor = (item, layout, side, unitToPx) => {
  const segments = findExposedSegments(item, layout, side);
  if (segments.length === 0) return null;

  let best = null;
  let bestLenPx = 0;
  for (const [s, e] of segments) {
    const lenPx = (e - s) * unitToPx;
    if (lenPx > bestLenPx) {
      bestLenPx = lenPx;
      best = [s, e];
    }
  }
  if (bestLenPx < PLUS_BUTTON_MIN_EDGE_PX) return null;

  const isRight = side === 'right';
  const itemStart = isRight ? item.y : item.x;
  const itemSpan = isRight ? item.h : item.w;
  return { fraction: ((best[0] + best[1]) / 2 - itemStart) / itemSpan };
};

const findExposedSegments = (item, layout, side) => {
  const isRight = side === 'right';
  const edge = isRight ? item.x + item.w : item.y + item.h;
  const latStart = isRight ? item.y : item.x;
  const latEnd = latStart + (isRight ? item.h : item.w);

  // Lateral intervals where other tiles touch this edge.
  const blockers = [];
  for (const other of layout) {
    if (other === item) continue;
    const oPerpStart = isRight ? other.x : other.y;
    const oPerpEnd = oPerpStart + (isRight ? other.w : other.h);
    if (oPerpStart > edge || oPerpEnd <= edge) continue;
    const oLatStart = isRight ? other.y : other.x;
    const oLatEnd = oLatStart + (isRight ? other.h : other.w);
    const lo = Math.max(oLatStart, latStart);
    const hi = Math.min(oLatEnd, latEnd);
    if (hi > lo) blockers.push([lo, hi]);
  }
  blockers.sort((a, b) => a[0] - b[0]);

  // Walk blockers; the gaps between them are the exposed segments.
  const exposed = [];
  let cursor = latStart;
  for (const [s, e] of blockers) {
    if (s > cursor) exposed.push([cursor, s]);
    if (e > cursor) cursor = e;
  }
  if (cursor < latEnd) exposed.push([cursor, latEnd]);
  return exposed;
};

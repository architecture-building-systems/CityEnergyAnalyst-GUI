// One vertical scale for Sankey figures shown side by side, so the same
// flow draws at the same pixel width in every compare column.
//
// Mirrors the backend's `cea/visualisation/special/sankey_scale.py` (keep
// the two in step): Plotly's Sankey picks
//   ky = min over columns of (H - (n - 1) * pad) / column total
// for plot-area height H, and caps the padding at 2/3 * H / (max_n - 1).
// The backend stores each figure's columns (`[total, nodeCount]`), padding
// and unit in `layout.meta.sankey_scale`; this module derives one shared
// scale for the Sankeys of one card, or of a row of compare columns, and
// the height each needs at it. Unlike the backend's plot-tool batches there
// is no minimum figure height here: the card is the space, and the Sankeys
// always fit inside it.

const PLOTLY_PAD_RATIO = 2 / 3;

export const sankeyScaleOf = (div) => div?.layout?.meta?.sankey_scale ?? null;

// Padding that Plotly's cap leaves unchanged at scale `px`.
export const nodePad = (columns, px, pad) => {
  const maxN = Math.max(1, ...columns.map(([, n]) => n));
  if (maxN <= 1) return pad;
  const k = PLOTLY_PAD_RATIO / (maxN - 1);
  const fits = Math.max(
    ...columns.map(([total, n]) => (k * total * px) / (1 - k * (n - 1))),
  );
  return Math.min(pad, fits);
};

// Plot-area height that makes Plotly draw the figure at scale `px`.
export const plotHeight = (columns, px, pad) => {
  const p = nodePad(columns, px, pad);
  return Math.max(0, ...columns.map(([total, n]) => total * px + (n - 1) * p));
};

// The scale at which `heightAt(px)` (monotonically increasing) reaches `target`.
const invert = (heightAt, target) => {
  let low = 0;
  let high = 1;
  while (heightAt(high) < target) high *= 2;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (heightAt(mid) < target) low = mid;
    else high = mid;
  }
  return high;
};

// A stack is the Sankeys of one card: `{ figures, gaps, budget }`, where
// `figures` are `[{ columns, pad, margins }]` (margins = top + bottom, px),
// `gaps` the space between them and `budget` the card's chart height.
const stackHeight = ({ figures, gaps }, px) =>
  figures.reduce(
    (sum, f) => sum + plotHeight(f.columns, px, f.pad) + f.margins,
    gaps,
  );

// The shared scale for a set of stacks: the largest at which every stack
// fits its budget.
export const stackPxPerUnit = (stacks) => {
  const usable = stacks.filter(
    (stack) =>
      stack.figures.length > 0 &&
      stack.figures.every((f) => f.columns.length > 0),
  );
  if (usable.length === 0) return 0;
  return Math.min(
    ...usable.map((stack) =>
      invert((px) => stackHeight(stack, px), stack.budget),
    ),
  );
};

// Figure height (plot area + margins) and padding for one figure at `px`.
// Rounded down so a stack that fills its card never overshoots it.
export const scaledSize = ({ columns, pad, margins }, px) => ({
  height: Math.floor(plotHeight(columns, px, pad) + margins),
  pad: nodePad(columns, px, pad),
});

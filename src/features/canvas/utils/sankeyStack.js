// Sankeys rendered on the canvas, sized so equal flows draw at equal width.
//
// A card's chart area holds one or more figures (one per what-if); those
// Sankeys form a stack that shares the card's height at one scale (see
// `sankeyScale.js`). A card on its own scales its stack itself (a single
// Sankey then simply fits the card); in compare mode `usePlotAlignment`
// scales the stacks of every column together and marks their areas, after
// which a card hands its resizes to the aligner instead.

import { sankeyScaleOf, scaledSize, stackPxPerUnit } from './sankeyScale';

// `data-chart-area` on CanvasPlot's chart area, so a figure can find its card.
export const CHART_AREA_SELECTOR = '[data-chart-area]';
// Set on a chart area while `usePlotAlignment` owns its scale.
export const SANKEY_ALIGNED_ATTR = 'sankeyAligned';
// Dispatched on an aligned chart area when its card resizes.
export const PLOT_RESIZE_EVENT = 'cea:plot-resize';

const figureDivs = (area) => [...area.querySelectorAll('.js-plotly-plot')];

// The stack in `area`, or null unless every figure is a scale-tagged Sankey
// that Plotly has drawn.
export function readSankeyStack(area) {
  const divs = figureDivs(area);
  if (
    divs.length === 0 ||
    !divs.every((div) => sankeyScaleOf(div) && div._fullLayout)
  ) {
    return null;
  }
  const gap = parseFloat(getComputedStyle(area).rowGap) || 0;
  return {
    area,
    divs,
    unit: sankeyScaleOf(divs[0]).unit,
    // Live margins: CanvasPlot tightens the backend's (it lifts the title).
    figures: divs.map((div) => {
      const { columns, pad } = sankeyScaleOf(div);
      const { t = 0, b = 0 } = div._fullLayout.margin;
      return { columns, pad, margins: t + b };
    }),
    gaps: gap * (divs.length - 1),
    budget: area.clientHeight,
  };
}

// Size every figure of `stack` (and its wrapper) to draw at `px`.
function applySankeyStack(stack, px) {
  stack.divs.forEach((div, i) => {
    const { height, pad } = scaledSize(stack.figures[i], px);
    // CanvasPlot's wrappers share the area equally by default; a scaled
    // figure's wrapper takes exactly the figure's height instead.
    const wrapper = div.parentElement;
    wrapper.style.flex = '0 0 auto';
    wrapper.style.height = `${height}px`;
    // Same sequence as `fitPlotToParent`: drop the inline size the
    // backend HTML / newPlot wrote (a fixed height would keep the figure's
    // box at its old size), update, then resize so the Sankey re-flows.
    div.style.width = '';
    div.style.height = '';
    try {
      window.Plotly.update(
        div,
        { 'node.pad': pad },
        { height, width: wrapper.clientWidth },
      );
      window.Plotly.Plots?.resize?.(div);
    } catch {
      // Plot may have been removed
    }
  });
}

// Put `stacks` (e.g. one per compare column) on one shared scale.
export function scaleSankeyStacks(stacks) {
  if (!window.Plotly || stacks.length === 0) return;
  const px = stackPxPerUnit(stacks);
  stacks.forEach((stack) => applySankeyStack(stack, px));
}

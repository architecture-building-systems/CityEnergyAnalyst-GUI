// Refit every Plotly chart inside a container element. Skips charts
// that haven't been initialised yet (no `_fullLayout`) — fast renders
// from a cached Plotly CDN can have RO fire before `newPlot`'s
// promise resolves.
export function refitCharts(area) {
  area.querySelectorAll('.js-plotly-plot, .plotly-graph-div').forEach((div) => {
    if (!div._fullLayout) return;
    fitPlotToParent(div);
  });
}

// Resize a Plotly figure to its parent container. Three steps in
// order: clear the inline width/height that newPlot wrote (so
// Plotly is free to replace them), `relayout` the layout's dims to
// the wrapper's measured size, then `Plots.resize` to commit the
// redraw — Sankey and other fixed-dim traces cache pixel geometry
// during newPlot and only re-flow when both calls happen together.
export function fitPlotToParent(div) {
  const parent = div?.parentElement;
  if (!parent) return;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  if (w <= 0 || h <= 0) return;
  div.style.height = '';
  div.style.width = '';
  try {
    window.Plotly?.relayout?.(div, { width: w, height: h });
    window.Plotly?.Plots?.resize?.(div);
  } catch {
    // Error-card HTML snippets aren't Plotly figures — skip.
  }
}

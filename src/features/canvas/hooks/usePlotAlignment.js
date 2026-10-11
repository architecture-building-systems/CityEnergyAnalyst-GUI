import { useCallback, useEffect, useRef } from 'react';

import { sankeyScaleOf } from '../utils/sankeyScale';
import {
  CHART_AREA_SELECTOR,
  PLOT_RESIZE_EVENT,
  SANKEY_ALIGNED_ATTR,
  readSankeyStack,
  scaleSankeyStacks,
} from '../utils/sankeyStack';

/**
 * Hook that collects Plotly div references across columns and makes
 * the figures in each slot (same row across columns) visually
 * comparable, choosing the method per figure:
 *
 * - Cartesian charts share one y-axis range.
 * - Sankeys tagged with `layout.meta.sankey_scale` share one vertical
 *   scale (pixels per unit of flow): every column's card of Sankeys is
 *   scaled together (`utils/sankeyStack.js`), so a smaller total draws
 *   shorter. Only Sankeys in the same unit are compared; while aligned, a
 *   card hands its resizes back here.
 *
 * Usage:
 *   const { handlePlotReady } = usePlotAlignment(enabled, columnCount);
 *   // Pass handlePlotReady to each CanvasColumn as onPlotReady
 *
 * `generation` (optional) lets the caller invalidate the tracked
 * divs when the underlying plot configuration changes — without it,
 * a re-rendered chart's NEW plot div would be pushed alongside the
 * (now stale) OLD one, and the unifier would compute its range
 * from the wrong axis (e.g. an absolute-value range applied to a
 * percentage chart, squashing the data flat near zero).
 */
const usePlotAlignment = (enabled, columnCount, generation = 0) => {
  // Map of slotId → [plotDiv, plotDiv, ...]
  const plotDivsRef = useRef({});
  // Map of slotId → Set of chart areas whose Sankey scale this hook owns,
  // and the areas that already carry its resize listener (attached once
  // per card).
  const alignedAreasRef = useRef({});
  const listeningAreasRef = useRef(new WeakSet());
  const resizeTimersRef = useRef({});
  // Read at alignment time: a resize listener registered while enabled
  // must not re-align after the caller has turned alignment off
  // (PathwayMultiView does so on unlocking mirrors, with every row still
  // on screen).
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Bumping `generation` clears the tracked divs so the next round
  // of `handlePlotReady` calls populates a fresh set.
  useEffect(() => {
    plotDivsRef.current = {};
  }, [generation]);

  // Turning alignment off (e.g. back to a single column) hands every
  // aligned card back to scaling its own Sankeys.
  useEffect(() => {
    if (enabled) return;
    Object.values(alignedAreasRef.current).forEach((aligned) =>
      aligned.forEach((area) => releaseArea(area, aligned)),
    );
  }, [enabled]);

  // Lets an aligned card's resize listener re-run the latest `alignSlot`.
  const alignSlotRef = useRef(null);

  const alignSlot = useCallback((slotId) => {
    const Plotly = window.Plotly;
    const divs = (plotDivsRef.current[slotId] || []).filter(
      (d) => d.isConnected,
    );
    if (!enabledRef.current || !Plotly) return;
    alignedAreasRef.current[slotId] ??= new Set();
    alignYAxes(
      Plotly,
      divs.filter((div) => !sankeyScaleOf(div)),
    );
    // A card resize changes the room each card has, so the shared scale
    // is recomputed. Debounced: every column resizes at once.
    const onResize = () => {
      clearTimeout(resizeTimersRef.current[slotId]);
      resizeTimersRef.current[slotId] = setTimeout(
        () => alignSlotRef.current?.(slotId),
        50,
      );
    };
    alignSankeyStacks(
      divs.filter((div) => sankeyScaleOf(div)),
      alignedAreasRef.current[slotId],
      listeningAreasRef.current,
      onResize,
    );
  }, []);
  useEffect(() => {
    alignSlotRef.current = alignSlot;
  }, [alignSlot]);

  const handlePlotReady = useCallback(
    (slotId, plotDiv) => {
      if (!enabled) return;

      if (!plotDivsRef.current[slotId]) {
        plotDivsRef.current[slotId] = [];
      }

      // Avoid duplicates
      const existing = plotDivsRef.current[slotId];
      if (!existing.includes(plotDiv)) {
        existing.push(plotDiv);
      }

      // If we have enough divs for this slot, try to align
      if (existing.length >= columnCount) {
        // Wait a tick for Plotly to finish auto-ranging
        setTimeout(() => alignSlot(slotId), 100);
      }
    },
    [enabled, columnCount, alignSlot],
  );

  return { handlePlotReady };
};

function alignYAxes(Plotly, divs) {
  if (divs.length < 2) return;

  // Collect y-axis ranges from all divs for this slot
  let globalMin = Infinity;
  let globalMax = -Infinity;

  for (const div of divs) {
    const layout = div.layout;
    if (!layout?.yaxis?.range) continue;
    const [yMin, yMax] = layout.yaxis.range;
    if (yMin < globalMin) globalMin = yMin;
    if (yMax > globalMax) globalMax = yMax;
  }

  if (!isFinite(globalMin) || !isFinite(globalMax)) return;

  // Apply the unified range to all divs
  for (const div of divs) {
    try {
      Plotly.relayout(div, { 'yaxis.range': [globalMin, globalMax] });
    } catch {
      // Plot may have been removed
    }
  }
}

// Scale the Sankey cards of a slot (one per column) together, per unit.
// Recomputed on every run, over the slot's current cards and those aligned
// last time: a card whose Sankeys are gone or have no partner left (the
// other column now shows an error, another unit, or nothing) is released
// back to scaling itself — otherwise it would keep handing its resizes to
// an alignment that no longer includes it. `onResize` re-runs the
// alignment when an aligned card resizes.
function alignSankeyStacks(divs, alignedAreas, listeningAreas, onResize) {
  const areas = new Set([
    ...alignedAreas,
    ...divs.map((div) => div.closest(CHART_AREA_SELECTOR)).filter(Boolean),
  ]);
  const byUnit = new Map();
  areas.forEach((area) => {
    // A card that has left the canvas is simply forgotten.
    const stack = area.isConnected && readSankeyStack(area);
    if (stack) {
      byUnit.set(stack.unit, [...(byUnit.get(stack.unit) ?? []), stack]);
    } else {
      releaseArea(area, alignedAreas);
    }
  });

  byUnit.forEach((stacks) => {
    if (stacks.length < 2) {
      stacks.forEach(({ area }) => releaseArea(area, alignedAreas));
      return;
    }
    stacks.forEach(({ area }) => {
      alignedAreas.add(area);
      area.dataset[SANKEY_ALIGNED_ATTR] = 'true';
      if (!listeningAreas.has(area)) {
        listeningAreas.add(area);
        area.addEventListener(PLOT_RESIZE_EVENT, onResize);
      }
    });
    scaleSankeyStacks(stacks);
  });
}

// Hand a card back to scaling its own Sankeys.
function releaseArea(area, alignedAreas) {
  alignedAreas.delete(area);
  if (!area.dataset[SANKEY_ALIGNED_ATTR]) return;
  delete area.dataset[SANKEY_ALIGNED_ATTR];
  const stack = area.isConnected && readSankeyStack(area);
  if (stack) scaleSankeyStacks([stack]);
}

export default usePlotAlignment;

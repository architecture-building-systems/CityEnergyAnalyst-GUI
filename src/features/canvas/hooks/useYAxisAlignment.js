import { useCallback, useRef } from 'react';

/**
 * Hook that collects Plotly div references across columns and aligns
 * their y-axis ranges so plots are visually comparable.
 *
 * Usage:
 *   const { handlePlotReady } = useYAxisAlignment(enabled);
 *   // Pass handlePlotReady to each CanvasColumn as onPlotReady
 *
 * The hook groups divs by slotId (same row across columns) and, once
 * all columns have reported for a given slot, sets a unified y-range.
 */
const useYAxisAlignment = (enabled, columnCount) => {
  // Map of slotId → [plotDiv, plotDiv, ...]
  const plotDivsRef = useRef({});

  const alignSlot = useCallback((slotId) => {
    const divs = plotDivsRef.current[slotId];
    if (!divs || divs.length < 2) return;

    const Plotly = window.Plotly;
    if (!Plotly) return;

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
  }, []);

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

export default useYAxisAlignment;

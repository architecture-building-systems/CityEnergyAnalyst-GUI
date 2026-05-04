import { useMemo } from 'react';

import { useCanvasStore } from '../stores/canvasStore';
import CanvasPlot from './CanvasPlot';

/**
 * Spanning Emission Timeline strip — canvas chrome rendered above
 * the columns row when ``view === 'pathway-single'``. Shows the
 * selected pathway's cumulative emissions across its baked state
 * years; the columns below render a per-state-year detail view.
 *
 * Width tracks the canvas (the strip lives inside the same
 * `fit-content` shell as the columns row, so it grows / shrinks with
 * the column set). The Plotly figure itself fills the wrapper via
 * `CanvasPlot`'s existing resize hook; pixel-perfect tick alignment
 * to column centres is a follow-up — the year domain is shared with
 * the column headers so the visual association is already obvious.
 *
 * Hidden when there's no `comparisonSetup.pathwayName` (e.g. while
 * the user is mid-transition into pathway-single). The host
 * (`ComparisonView`) is responsible for only mounting the strip in
 * pathway-single mode; this component double-checks `view` so it
 * doesn't show up if state ever drifts.
 */
const PathwayTimelineStrip = () => {
  const view = useCanvasStore((s) => s.view);
  const pathwayName = useCanvasStore((s) => s.comparisonSetup?.pathwayName);
  const parentScenario = useCanvasStore((s) => s.parentScenario);

  const plotConfig = useMemo(() => {
    if (!pathwayName) return null;
    return {
      // ``plot-pathway-emission-timeline`` is the same script the
      // standalone Pathway Builder timeline uses. Passing a single
      // pathway name keeps the chart focused on the picker's
      // selection; multi-pathway is handled by the row layout
      // (Phase 6) instead of widening this strip.
      script: 'plot-pathway-emission-timeline',
      parameters: {
        'existing-pathway-names': [pathwayName],
      },
    };
  }, [pathwayName]);

  if (view !== 'pathway-single' || !plotConfig || !parentScenario) {
    return null;
  }

  return (
    <div style={stripStyle} aria-label="Pathway emission timeline">
      <CanvasPlot scenario={parentScenario} plotConfig={plotConfig} />
    </div>
  );
};

// Compact strip — tall enough for one Plotly trace plus axis labels,
// short enough that it doesn't dominate the canvas. Sits flush with
// the canvas's white surface (no border or shadow) so it reads as
// chrome rather than a card.
const stripStyle = {
  width: '100%',
  minHeight: 160,
  marginBottom: 12,
  background: '#fff',
};

export default PathwayTimelineStrip;

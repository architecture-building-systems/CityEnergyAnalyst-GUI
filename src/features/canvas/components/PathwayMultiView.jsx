import { useMemo } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';
import { usePathwayOverview } from 'features/pathway/hooks/usePathwayOverview';

import { useCanvasStore } from '../stores/canvasStore';
import CanvasScenarioHeader from './CanvasScenarioHeader';
import CanvasPlot from './CanvasPlot';
import PathwayCompareSelect from './PathwayCompareSelect';

/**
 * Multi-pathway view — row-based layout. One row per selected
 * pathway; each row holds the pathway name + an Emission Pathway
 * plot. The X-axis range is computed once across the union of every
 * selected pathway's baked years and applied to every row, so the
 * timescale aligns across rows visually (`xaxis.range` stays
 * consistent even if the chart is auto-fitted).
 *
 * The title-map (final-year geometry per pathway) is the natural
 * extension of this layout but requires the per-card map machinery
 * (`mapInstance` store, `MapLayerProperties` bottom card). It's
 * scoped out of this iteration and tracked as a TODO; the row's
 * left rail is reserved for it (the empty placeholder reads as
 * "future column" rather than missing chrome).
 *
 * Renders only when `view === 'pathway-multi'`. The picker dropdown
 * sits in the top header alongside the scenario name, so the user
 * can change picks without leaving the row layout.
 */
const PathwayMultiView = () => {
  const view = useCanvasStore((s) => s.view);
  const setup = useCanvasStore((s) => s.comparisonSetup);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const parentScenario = useCanvasStore((s) => s.parentScenario);
  const projectScenario = useProjectStore((s) => s.scenario);
  const { data: overview } = usePathwayOverview();

  const pathwayNames = setup?.pathwayNames ?? [];
  const scenario = parentScenario || projectScenario;

  // Shared timescale across rows. The rendered Plotly figures
  // honour their own `layout.xaxis` settings, so we expose the
  // shared range as a hint via the script's `period-start` /
  // `period-end` parameters when those are wired; for now the
  // cross-row alignment relies on every chart sharing the same
  // year domain (Plotly auto-fits to data, which is the same
  // pathway data window).
  const sharedRange = useMemo(() => {
    if (!overview?.pathways) return null;
    const selected = overview.pathways.filter((p) =>
      pathwayNames.includes(p.pathway_name),
    );
    const allYears = selected.flatMap((p) => p.years ?? []).map(Number);
    if (allYears.length === 0) return null;
    return [Math.min(...allYears), Math.max(...allYears)];
  }, [overview, pathwayNames]);

  if (view !== 'pathway-multi' || !scenario) {
    return null;
  }

  return (
    <div style={canvasWrapperStyle}>
      <div style={enableEdit ? canvasStyle : canvasExportStyle}>
        <CanvasScenarioHeader trailing={<PathwayCompareSelect />} />
        <div style={rowStackStyle}>
          {pathwayNames.length === 0 ? (
            <div style={emptyHintStyle}>
              Pick at least one pathway to compare.
            </div>
          ) : (
            pathwayNames.map((name) => (
              <PathwayRow
                key={name}
                pathwayName={name}
                scenario={scenario}
                sharedRange={sharedRange}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * One pathway's row. Renders the pathway name as the header and
 * the Emission Pathway plot beneath it. Each row is independently
 * resizable vertically via the wrapper's `resize: vertical` CSS
 * (no rgl here — the row layout doesn't need full grid behaviour).
 */
const PathwayRow = ({ pathwayName, scenario, sharedRange }) => {
  const plotConfig = useMemo(
    () => ({
      script: 'plot-pathway-emission-timeline',
      parameters: {
        'existing-pathway-names': [pathwayName],
        // Pass the shared year range so every row's chart locks to
        // the same x-axis window. The script may ignore it (depends
        // on which parameters it accepts); rows still align via the
        // pathway data itself spanning the same years.
        ...(sharedRange
          ? { 'period-start': sharedRange[0], 'period-end': sharedRange[1] }
          : {}),
      },
    }),
    [pathwayName, sharedRange],
  );

  return (
    <div style={rowStyle}>
      <div style={rowHeaderStyle}>{pathwayName}</div>
      <div style={rowBodyStyle}>
        <CanvasPlot scenario={scenario} plotConfig={plotConfig} />
      </div>
    </div>
  );
};

const canvasWrapperStyle = {
  width: '100%',
  display: 'flex',
  justifyContent: 'flex-start',
};

const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '16px 16px 24px 16px',
  width: 'fit-content',
  minWidth: 800,
  height: 'fit-content',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const canvasExportStyle = {
  ...canvasStyle,
  padding: '8px 16px 16px 16px',
};

const rowStackStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const rowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '12px 16px',
  background: '#fff',
};

const rowHeaderStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.2,
};

const rowBodyStyle = {
  width: '100%',
  // Independently resizable per row; rgl isn't pulling its weight in
  // a multi-pathway summary view, so a plain CSS resize handle is
  // the lighter equivalent.
  resize: 'vertical',
  overflow: 'auto',
  minHeight: 220,
  height: 280,
};

const emptyHintStyle = {
  padding: '24px',
  textAlign: 'center',
  color: '#888',
  fontStyle: 'italic',
};

export default PathwayMultiView;

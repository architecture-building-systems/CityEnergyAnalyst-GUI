import { useMemo } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';
import MapThumbnail from './MapThumbnail';
import FeatureCard from './FeatureCard';

/**
 * A single report column.
 *
 * Composition:
 *   Header → Map card → FeatureCard × N
 *
 * Plots are grouped by feature. Each feature rendered as its own
 * FeatureCard containing the feature's KPI section and a vertically-
 * stacked list of that feature's plots.
 *
 * Props:
 *   columnDef    — { type, scenario, whatif?, feature? }
 *   plotSlots    — [{ id, feature, plotConfig? }]
 *   style        — optional style overrides
 */
const ReportColumn = ({
  columnDef,
  plotSlots = [],
  style,
  onEditSlot,
  onResetSlot,
  onDeleteSlot,
  onPlotReady,
  onAddPlot,
}) => {
  const project = useProjectStore((s) => s.project);

  const scenario = columnDef.scenario;
  const whatif = columnDef.whatif || null;

  // Group plots by feature, preserving insertion order so the first-
  // added feature shows up first.
  const featureGroups = useMemo(() => {
    const map = new Map();
    for (const slot of plotSlots) {
      const feature = slot.feature || 'demand';
      if (!map.has(feature)) map.set(feature, []);
      map.get(feature).push(slot);
    }
    return map;
  }, [plotSlots]);

  // When the column has no plots yet, still show one preview feature
  // card so the user sees KPIs immediately. Inter-feature columns
  // preview their own feature; all other columns fall back to demand.
  const fallbackFeature =
    columnDef.type === 'feature' ? columnDef.feature : 'demand';
  const featuresToRender =
    featureGroups.size > 0
      ? Array.from(featureGroups.keys())
      : [fallbackFeature];

  let headerText = scenario;
  if (columnDef.type === 'whatif' && columnDef.whatif) {
    headerText = `${scenario}: ${columnDef.whatif}`;
  }

  return (
    <div style={{ ...columnStyle, ...style }}>
      <div style={headerStyle}>{headerText}</div>

      {/* Map card — fills its card edge-to-edge. */}
      <div style={mapCardStyle}>
        <MapThumbnail project={project} scenario={scenario} />
      </div>

      {/* One card per feature present in this column. */}
      {featuresToRender.map((feature) => (
        <FeatureCard
          key={feature}
          project={project}
          scenario={scenario}
          whatif={whatif}
          feature={feature}
          plots={featureGroups.get(feature) || []}
          onEditSlot={onEditSlot}
          onResetSlot={onResetSlot}
          onDeleteSlot={onDeleteSlot}
          onPlotReady={onPlotReady}
          onAddPlot={onAddPlot ? () => onAddPlot(feature) : undefined}
        />
      ))}
    </div>
  );
};

const columnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const headerStyle = {
  fontSize: 22,
  fontWeight: 700,
  color: '#222',
};

const mapCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  overflow: 'hidden',
};

export default ReportColumn;

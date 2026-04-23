import { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import { CreateNewIcon } from 'assets/icons';

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
  onAddColumn,
  addColumnTooltip = 'Add column',
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
      {/* Title card + optional "+" button, side by side. Button mirrors
          the pathway builder's "create new pathway" control next to its
          pathway dropdown (see PathwayPanel.jsx). */}
      <div style={titleRowStyle}>
        <div style={titleCardStyle}>
          <div style={headerStyle}>{headerText}</div>
        </div>
        {onAddColumn && (
          <div className="cea-card-icon-button-container">
            <Tooltip title={addColumnTooltip} placement="bottom">
              <Button
                type="text"
                icon={<CreateNewIcon />}
                onClick={onAddColumn}
                aria-label={addColumnTooltip}
              />
            </Tooltip>
          </div>
        )}
      </div>

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

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

// Every card inside the canvas uses CSS-native `resize: both`. The
// browser draws a small handle in the bottom-right corner the user can
// drag to resize in either axis. `overflow: hidden` is required for
// `resize` to apply; children clip rather than scroll.
const titleCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '10px 16px',
  resize: 'both',
  overflow: 'hidden',
  minWidth: 240,
  // Sized to the text — no vertical minimum so the card hugs its title.
  display: 'flex',
  alignItems: 'center',
};

const headerStyle = {
  fontSize: 22,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.2,
};

const mapCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  overflow: 'hidden',
  resize: 'both',
  minWidth: 240,
  minHeight: 120,
  // Initial size so the map has room to render before any user drag.
  // `resize: both` lets the user override both axes from here.
  height: 200,
};

export default ReportColumn;

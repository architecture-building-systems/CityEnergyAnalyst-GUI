import { useMemo } from 'react';

import { useFetchSummary } from '../hooks/useReportsData';
import KpiStrip from './KpiStrip';
import PlotSlotCard from './PlotSlotCard';
import AddPlotButton from './AddPlotButton';

/**
 * Feature title and KPI description for each supported feature.
 * Lives with FeatureCard because FeatureCard is the only consumer.
 */
const FEATURE_META = {
  demand: {
    title: 'Building energy demand',
    description: 'EUI (kWh/m2/yr) in this district:',
  },
  'final-energy': {
    title: 'Energy by carrier',
    description: 'Final energy in this district:',
  },
  costs: {
    title: 'System costs',
    description: 'Annualised costs in this district:',
  },
  emissions: {
    title: 'Operational emissions',
    description: 'GHG emissions in this district:',
  },
  'heat-rejection': {
    title: 'Anthropogenic heat rejection',
    description: 'Heat rejected in this district:',
  },
};

function buildKpiProps(summary) {
  if (!summary || !summary.kpis || summary.kpis.length === 0) {
    return { primaryValue: null, primaryLabel: null, pills: [] };
  }
  const [primary, ...rest] = summary.kpis;

  let primaryDisplay = primary.value;
  if (typeof primary.value === 'number') {
    if (Math.abs(primary.value) >= 1000) {
      primaryDisplay = `${Math.round(primary.value / 1000)}K`;
    } else {
      primaryDisplay = String(Math.round(primary.value));
    }
  }

  return {
    primaryValue: primaryDisplay,
    primaryLabel: primary.label,
    pills: rest.slice(0, 4).map((k) => ({
      value: typeof k.value === 'number' ? Math.round(k.value) : k.value,
      label: k.label,
    })),
  };
}

/**
 * One feature's slice of a report column: KPI section on top, plots
 * stacked vertically below. Renders whether or not plots exist — an
 * empty feature still shows its KPIs as a preview.
 */
const FeatureCard = ({
  project,
  scenario,
  whatif,
  feature,
  plots = [],
  onEditSlot,
  onResetSlot,
  onDeleteSlot,
  onPlotReady,
  onAddPlot,
}) => {
  const { data: summary, isLoading } = useFetchSummary(
    project,
    scenario,
    feature,
    whatif,
  );
  const meta = FEATURE_META[feature] || { title: feature, description: '' };
  const kpiProps = useMemo(() => buildKpiProps(summary), [summary]);

  return (
    <div style={cardStyle}>
      {/* KPI section */}
      <div style={kpiSectionStyle}>
        <KpiStrip
          featureTitle={meta.title}
          description={meta.description}
          primaryValue={kpiProps.primaryValue}
          primaryLabel={kpiProps.primaryLabel}
          pills={kpiProps.pills}
          loading={isLoading}
        />
      </div>

      {/* Plot section — stacked vertically, with "Add a plot" at bottom */}
      {(plots.length > 0 || onAddPlot) && (
        <div style={plotsSectionStyle}>
          {plots.map((slot) => (
            <PlotSlotCard
              key={slot.id}
              project={project}
              scenario={scenario}
              feature={slot.feature}
              whatif={whatif}
              plotConfig={slot.plotConfig}
              onEdit={() => onEditSlot?.(slot.id)}
              onReset={() => onResetSlot?.(slot.id)}
              onDelete={
                onDeleteSlot ? () => onDeleteSlot(slot.id) : undefined
              }
              onPlotReady={
                onPlotReady
                  ? (plotDiv) => onPlotReady(slot.id, plotDiv)
                  : undefined
              }
            />
          ))}
          {onAddPlot && (
            <div style={plots.length > 0 ? addPlotRowWithDividerStyle : undefined}>
              <AddPlotButton label="Add a plot" onClick={onAddPlot} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Resizable via CSS. Browser draws a drag handle in the bottom-right
// corner; `overflow: hidden` is required for `resize` to apply.
const cardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  resize: 'both',
  overflow: 'hidden',
  minWidth: 280,
  minHeight: 120,
};

const kpiSectionStyle = {};

const plotsSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  paddingTop: 12,
  borderTop: '1px solid #f0f0f0',
};

const addPlotRowWithDividerStyle = {
  borderTop: '1px solid #f0f0f0',
  paddingTop: 8,
  marginTop: 4,
};

export default FeatureCard;

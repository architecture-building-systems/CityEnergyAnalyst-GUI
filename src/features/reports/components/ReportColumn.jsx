import { useMemo } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useFetchSummary } from '../hooks/useReportsData';
import MapThumbnail from './MapThumbnail';
import KpiStrip from './KpiStrip';
import PlotSlotCard from './PlotSlotCard';

/**
 * Feature title and KPI description for each supported feature.
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

/**
 * Build KpiStrip props from summary API response.
 */
function buildKpiProps(summary, feature) {
  if (!summary || !summary.kpis || summary.kpis.length === 0) {
    return { primaryValue: null, primaryLabel: null, pills: [] };
  }

  const kpis = summary.kpis;

  // First KPI becomes the large primary value, rest become pills
  const primary = kpis[0];
  const rest = kpis.slice(1);

  // Format large number
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
 * A single report column.
 *
 * Props:
 *   columnDef    — { type, scenario, whatif?, feature? }
 *   plotSlots    — [{ id, feature }]
 *   style        — optional style overrides
 */
const ReportColumn = ({
  columnDef,
  plotSlots = [],
  style,
}) => {
  const project = useProjectStore((s) => s.project);

  const scenario = columnDef.scenario;
  const whatif = columnDef.whatif || null;

  // Determine which feature to show KPIs for
  const kpiFeature =
    columnDef.type === 'feature'
      ? columnDef.feature
      : plotSlots[0]?.feature || 'demand';

  const { data: summary, isLoading: summaryLoading } = useFetchSummary(
    project,
    scenario,
    kpiFeature,
    whatif,
  );

  const meta = FEATURE_META[kpiFeature] || {
    title: kpiFeature,
    description: '',
  };

  const kpiProps = useMemo(
    () => buildKpiProps(summary, kpiFeature),
    [summary, kpiFeature],
  );

  // Build header text
  let headerText = scenario;
  if (columnDef.type === 'whatif' && columnDef.whatif) {
    headerText = `${scenario}: ${columnDef.whatif}`;
  }

  return (
    <div style={{ ...columnStyle, ...style }}>
      {/* Map thumbnail */}
      <MapThumbnail project={project} scenario={scenario} />

      {/* Header */}
      <div style={headerStyle}>{headerText}</div>

      {/* KPI strip */}
      <KpiStrip
        featureTitle={meta.title}
        description={meta.description}
        primaryValue={kpiProps.primaryValue}
        primaryLabel={kpiProps.primaryLabel}
        pills={kpiProps.pills}
        loading={summaryLoading}
      />

      {/* Plot slots */}
      {plotSlots.map((slot) => (
        <PlotSlotCard
          key={slot.id}
          project={project}
          scenario={scenario}
          feature={slot.feature}
          whatif={whatif}
          onEdit={() => {}}
          onReset={() => {}}
        />
      ))}

    </div>
  );
};

const columnStyle = {};

const headerStyle = {
  fontSize: 22,
  fontWeight: 700,
  marginTop: 8,
  marginBottom: 4,
  color: '#222',
};

export default ReportColumn;

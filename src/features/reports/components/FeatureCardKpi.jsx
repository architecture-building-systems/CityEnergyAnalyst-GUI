import { useMemo } from 'react';

import { useFetchSummary } from '../hooks/useReportsData';
import KpiStrip from './KpiStrip';
import { FeatureCardShell, sectionDividerStyle } from './featureCardCommon';

/**
 * KPI-only feature card: family title + a single KPI strip for the
 * card's `feature`. Card-level deletion lives in the title trio
 * (rendered by FeatureCardShell).
 *
 * The selection mechanism (which KPI to display, custom KPI sets…)
 * is not wired yet — backend module pending. Today the strip just
 * shows whatever `useFetchSummary` returns for the feature, same as
 * the coupled FeatureCard before the split.
 *
 * Props:
 *   card             — { id, feature }
 *   project, scenario, whatif — passed through to useFetchSummary
 *   onDeleteCard()
 */
const FeatureCardKpi = ({ card, project, scenario, whatif, onDeleteCard }) => {
  const { feature } = card;
  const { data: summary, isLoading } = useFetchSummary(
    project,
    scenario,
    feature,
    whatif,
  );

  const kpiProps = useMemo(() => buildKpiProps(summary), [summary]);

  return (
    <FeatureCardShell feature={feature} onDeleteCard={onDeleteCard}>
      <div style={sectionDividerStyle} />
      <div style={kpiSectionStyle}>
        <KpiStrip
          primaryValue={kpiProps.primaryValue}
          primaryLabel={kpiProps.primaryLabel}
          pills={kpiProps.pills}
          loading={isLoading}
        />
      </div>
    </FeatureCardShell>
  );
};

function buildKpiProps(summary) {
  if (!summary || !summary.kpis || summary.kpis.length === 0) {
    return { primaryValue: null, primaryLabel: null, pills: [] };
  }
  const [primary, ...rest] = summary.kpis;
  let primaryDisplay = primary.value;
  if (typeof primary.value === 'number') {
    primaryDisplay =
      Math.abs(primary.value) >= 1000
        ? `${Math.round(primary.value / 1000)}K`
        : String(Math.round(primary.value));
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

const kpiSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

export default FeatureCardKpi;

import { useMemo } from 'react';
import { Dropdown, Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';

import {
  PLOT_GROUPS,
  PLOT_LABELS,
  VIEW_PLOT_RESULTS,
} from 'features/plots/constants';
import {
  DEMAND,
  FINAL_ENERGY,
  COST_BREAKDOWN,
  EMISSIONS_OPERATIONAL,
  ANTHROPOGENIC_HEAT,
} from 'features/map/constants';

import { useFetchSummary } from '../hooks/useReportsData';
import KpiStrip from './KpiStrip';
import PlotSlotCard from './PlotSlotCard';
import AddPlotButton from './AddPlotButton';

// One "anchor" map constant per feature. The dropdown list is then
// derived at render time from the group/subgroup in `PLOT_GROUPS`
// that contains the anchor — so adding a new plot to an existing
// group (e.g. a new GHG emissions plot under Life Cycle Analysis →
// GHG Emissions) shows up in the dropdown automatically with no
// change needed here. Only adding a brand-new feature card requires
// a new anchor entry.
const FEATURE_ANCHOR = {
  demand: DEMAND,
  'final-energy': FINAL_ENERGY,
  costs: COST_BREAKDOWN,
  emissions: EMISSIONS_OPERATIONAL,
  'heat-rejection': ANTHROPOGENIC_HEAT,
};

// Walk PLOT_GROUPS to find the keys array (group or subgroup) that
// contains the anchor. Returns `null` if not found.
function findKeysContaining(anchor) {
  if (!anchor) return null;
  for (const group of PLOT_GROUPS) {
    if (group.keys?.includes(anchor)) return group.keys;
    if (group.subgroups) {
      for (const sub of group.subgroups) {
        if (sub.keys?.includes(anchor)) return sub.keys;
      }
    }
  }
  return null;
}

function getQuickPickOptions(feature) {
  const keys = findKeysContaining(FEATURE_ANCHOR[feature]) || [];
  return keys
    .map((key) => {
      const script = VIEW_PLOT_RESULTS[key];
      if (!script) return null;
      return { key, script, label: PLOT_LABELS[key] || key };
    })
    .filter(Boolean);
}

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
  const quickPickOptions = useMemo(
    () => getQuickPickOptions(feature),
    [feature],
  );

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
            <div
              style={{
                ...(plots.length > 0 ? addPlotRowWithDividerStyle : null),
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AddPlotButton label="Add a plot" onClick={() => onAddPlot()} />
              {quickPickOptions.length > 0 && (
                <Dropdown
                  menu={{
                    items: quickPickOptions.map((opt) => ({
                      key: opt.script,
                      label: opt.label,
                      onClick: () => onAddPlot(opt.script),
                    })),
                  }}
                  placement="topRight"
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    icon={<DownOutlined />}
                    aria-label="Quick-pick plot for this feature"
                  />
                </Dropdown>
              )}
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

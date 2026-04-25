import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Select, Tooltip } from 'antd';
import { BinAnimationIcon, InputEditorIcon } from 'assets/icons';

import {
  PLOT_GROUPS,
  PLOT_LABELS,
  VIEW_PLOT_RESULTS,
} from 'features/plots/constants';
// `cea-template-select` — same pill used by the pathway builder.
import 'features/project/components/Cards/OverviewCard/OverviewCard.css';

import { useFetchSummary } from '../hooks/useReportsData';
import KpiStrip from './KpiStrip';
import PlotSlotCard from './PlotSlotCard';

// A card's `feature` is the first key in its plot family (see
// ReportColumn's plot menu builder). Walk PLOT_GROUPS to find the
// owning group/subgroup so we can label the card and list its
// quick-pick plots without a parallel feature→label dictionary.
// Subgroups inherit their parent group's icon.
function findFamilyForFeature(feature) {
  if (!feature) return null;
  for (const group of PLOT_GROUPS) {
    if (group.keys?.includes(feature)) {
      return { label: group.label, keys: group.keys, icon: group.icon };
    }
    if (group.subgroups) {
      for (const sub of group.subgroups) {
        if (sub.keys?.includes(feature)) {
          return { label: sub.label, keys: sub.keys, icon: group.icon };
        }
      }
    }
  }
  return null;
}

function getQuickPickOptions(feature) {
  const family = findFamilyForFeature(feature);
  const keys = family?.keys || [];
  return keys
    .map((key) => {
      const script = VIEW_PLOT_RESULTS[key];
      if (!script) return null;
      return { key, script, label: PLOT_LABELS[key] || key };
    })
    .filter(Boolean);
}

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
 * Feature-bound card: KPI strip + vertically-stacked plots + an
 * "Add a plot" dropdown. Sizing is owned by the parent
 * `react-grid-layout` tile — this component fills 100% of whatever
 * box the library assigns and never sets its own width/height.
 *
 * Props:
 *   card            — { id, feature, plots }
 *   project,        scenario, whatif — passed through to fetch hooks
 *   onEditPlot(plotId), onDeletePlot(plotId)
 *   onAddPlot(script?)             — add a plot to this card
 *   onDeleteCard()
 *   onPlotReady(plotId, plotDiv)   — y-axis alignment hook
 *   onPreferredHeight(cardId, totalPx) — fires when plots report
 *     their natural height; parent grows card.h to fit.
 */
const FeatureCard = ({
  card,
  project,
  scenario,
  whatif,
  onEditPlot,
  onDeletePlot,
  onAddPlot,
  onDeleteCard,
  onPlotReady,
  onPreferredHeight,
}) => {
  const { feature, plots } = card;
  const { data: summary, isLoading } = useFetchSummary(
    project,
    scenario,
    feature,
    whatif,
  );

  const family = useMemo(() => findFamilyForFeature(feature), [feature]);
  const title = family?.label || feature;
  const kpiProps = useMemo(() => buildKpiProps(summary), [summary]);
  const quickPickOptions = useMemo(
    () => getQuickPickOptions(feature),
    [feature],
  );

  // KPI strip is dismissible independently of the card itself
  // (card-level deletion lives in the title trio). Not persisted —
  // hiding a strip isn't interesting enough to round-trip.
  const [kpiHidden, setKpiHidden] = useState(false);

  // Per-plot natural-height aggregation: each PlotSlotCard reports
  // its chart's backend-baked pixel height (or nothing, for plots
  // that autosize). Sum + chrome → `onPreferredHeight` so the
  // column can grow `card.h` to fit on first render.
  const [plotHeights, setPlotHeights] = useState({});
  const handleNaturalHeight = useCallback(
    (plotId) => (heightPx) =>
      setPlotHeights((prev) =>
        prev[plotId] === heightPx ? prev : { ...prev, [plotId]: heightPx },
      ),
    [],
  );
  useEffect(() => {
    const measured = Object.values(plotHeights);
    if (measured.length === 0 || !onPreferredHeight) return;
    const total = measured.reduce((a, b) => a + b, 0) + CARD_CHROME_PX;
    onPreferredHeight(card.id, total);
  }, [plotHeights, card.id, onPreferredHeight]);

  const cardInner = (
    <div style={cardStyle}>
      {/* ── Title section ───────────────────────────────────── */}
      <div style={titleSectionStyle}>
        <div style={featureTitleStyle}>
          {family?.icon && (
            <family.icon
              style={{ fontSize: 18, color: '#555', flexShrink: 0 }}
              aria-hidden
            />
          )}
          <span>{title}</span>
        </div>
        {onDeleteCard && <TitleDeleteButton onClick={onDeleteCard} />}
      </div>

      {!kpiHidden && (
        <>
          <div style={sectionDividerStyle} />

          {/* ── KPI section ─────────────────────────────────────── */}
          <div style={kpiSectionStyle}>
            <KpiStrip
              primaryValue={kpiProps.primaryValue}
              primaryLabel={kpiProps.primaryLabel}
              pills={kpiProps.pills}
              loading={isLoading}
            />
            <div style={sectionActionsStyle}>
              <KpiActionButtons
                onEdit={null}
                onDelete={() => setKpiHidden(true)}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Plot section ────────────────────────────────────── */}
      {(plots.length > 0 || onAddPlot) && (
        <>
          <div style={sectionDividerStyle} />
          <div style={plotsSectionStyle}>
            {plots.map((plot, idx) => (
              <Fragment key={plot.id}>
                {idx > 0 && <div style={plotDividerStyle} />}
                <PlotSlotCard
                  scenario={scenario}
                  plotConfig={plot.plotConfig}
                  onEdit={() => onEditPlot?.(plot.id)}
                  onDelete={
                    onDeletePlot ? () => onDeletePlot(plot.id) : undefined
                  }
                  onPlotReady={
                    onPlotReady
                      ? (plotDiv) => onPlotReady(plot.id, plotDiv)
                      : undefined
                  }
                  onNaturalHeight={handleNaturalHeight(plot.id)}
                />
              </Fragment>
            ))}
            {onAddPlot && (
              <div
                style={
                  plots.length > 0 ? addPlotRowWithDividerStyle : undefined
                }
              >
                <AddPlotSelect
                  options={quickPickOptions}
                  onPick={(script) => onAddPlot(script)}
                  onFallback={() => onAddPlot()}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return cardInner;
};

const TitleDeleteButton = ({ onClick }) => (
  <Popconfirm
    title="Delete this card?"
    description="All plots inside this card will be removed."
    okText="Delete"
    cancelText="Cancel"
    okButtonProps={{ danger: true }}
    onConfirm={onClick}
  >
    <div className="cea-card-icon-button-container">
      <Tooltip title="Delete card" placement="bottom">
        <Button
          type="text"
          icon={<BinAnimationIcon style={{ color: '#f04d5b' }} />}
          aria-label="Delete card"
        />
      </Tooltip>
    </div>
  </Popconfirm>
);

// `onEdit` is a placeholder until the KPI editor lands — rendered
// disabled when not wired. `onDelete` hides just the KPI strip;
// card-level deletion lives in the title trio.
const KpiActionButtons = ({ onEdit, onDelete }) => (
  <div className="cea-card-icon-button-container">
    <Tooltip title="Edit KPI" placement="bottom">
      <Button
        type="text"
        icon={<InputEditorIcon />}
        onClick={onEdit}
        disabled={!onEdit}
        aria-label="Edit KPI"
      />
    </Tooltip>
    {onDelete && (
      <Tooltip title="Hide KPI" placement="bottom">
        <Button
          type="text"
          icon={<BinAnimationIcon style={{ color: '#f04d5b' }} />}
          onClick={onDelete}
          aria-label="Hide KPI"
        />
      </Tooltip>
    )}
  </div>
);

const AddPlotSelect = ({ options, onPick, onFallback }) => {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const hasOptions = options.length > 0;

  return (
    <Select
      key={resetKey}
      className={`cea-template-select ${
        hasOptions ? '' : 'cea-template-select-empty'
      }`}
      style={{ width: 208 }}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder="Add a plot"
      options={options.map((opt) => ({ label: opt.label, value: opt.script }))}
      value={null}
      onSelect={(script) => {
        onPick(script);
        setOpen(false);
        setResetKey((k) => k + 1);
      }}
      open={hasOptions ? open : false}
      onOpenChange={hasOptions ? setOpen : undefined}
      onClick={hasOptions ? undefined : onFallback}
      allowClear={false}
      notFoundContent={<small>No plots available</small>}
    />
  );
};

// Fills the tile assigned by react-grid-layout — no own min/max,
// no resize handle. Internal overflow is handled by per-section
// scroll/ellipsis rules below.
const cardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '8px 16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

const titleSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const featureTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 700,
  fontSize: 15,
  color: '#222',
  minWidth: 0,
  overflow: 'hidden',
};

const sectionDividerStyle = {
  borderTop: '1px solid #f0f0f0',
};

const sectionActionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
};

const kpiSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

// `flex: 1` + `minHeight: 0` lets this section shrink below its
// content's natural height when the user drags the card shorter.
const plotsSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  flex: 1,
  minHeight: 0,
};

const addPlotRowWithDividerStyle = {
  borderTop: '1px solid #f0f0f0',
  paddingTop: 8,
  marginTop: 4,
};

const plotDividerStyle = {
  borderTop: '1px solid #f0f0f0',
};

// Title row + KPI strip + dividers + padding. Slightly generous —
// the parent only grows the card if it's currently too small, so
// over-estimating just means the card lands a row taller.
const CARD_CHROME_PX = 180;

export default FeatureCard;

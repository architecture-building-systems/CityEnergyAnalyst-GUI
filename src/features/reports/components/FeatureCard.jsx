import { useMemo, useState } from 'react';
import { Button, Popconfirm, Select, Tooltip } from 'antd';
import {
  BinAnimationIcon,
  CreateNewIcon,
  InputEditorIcon,
  RefreshIcon,
} from 'assets/icons';

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
import { useQueryClient } from '@tanstack/react-query';

// `feature` on a card is the first key of the plot family it
// belongs to (see ReportColumn's `buildFamilyMenuItems`). So to
// find a card's family label and available plots, walk PLOT_GROUPS
// looking for the group/subgroup that contains that key. No
// hardcoded feature→label dictionary to keep in sync.
function findFamilyForFeature(feature) {
  if (!feature) return null;
  for (const group of PLOT_GROUPS) {
    if (group.keys?.includes(feature)) {
      return { label: group.label, keys: group.keys };
    }
    if (group.subgroups) {
      for (const sub of group.subgroups) {
        if (sub.keys?.includes(feature)) {
          return { label: sub.label, keys: sub.keys };
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
 * Feature-bound card in the report grid: KPI section, vertically-
 * stacked plots, an "Add a plot" dropdown, and hover-revealed +
 * affordances on the right and bottom edges for growing the grid
 * southeast.
 *
 * Props:
 *   card             — { id, feature, plots }
 *   project/scenario — passed through for data fetching
 *   whatif           — passed through (inter-whatif mode)
 *   onEditPlot(plotId)
 *   onResetPlot(plotId)
 *   onDeletePlot(plotId)
 *   onAddPlot(script?)             — add a plot to this card
 *   onAddCardRight()               — insert a new card to the right
 *   onAddCardBottom()              — insert a new card below
 *   onPlotReady(plotId, plotDiv)   — y-axis alignment hook
 */
const FeatureCard = ({
  card,
  project,
  scenario,
  whatif,
  onEditPlot,
  onResetPlot,
  onDeletePlot,
  onAddPlot,
  onAddCardRight,
  onAddCardBottom,
  onDeleteCard,
  onPlotReady,
}) => {
  const { feature, plots } = card;
  const queryClient = useQueryClient();
  const { data: summary, isLoading } = useFetchSummary(
    project,
    scenario,
    feature,
    whatif,
  );

  // Invalidate the KPI summary query so it refetches. Keyed the same
  // way `useFetchSummary` keys it in useReportsData.js.
  const handleRefreshKpi = () => {
    queryClient.invalidateQueries({
      queryKey: ['reports', 'summary', project, scenario, feature, whatif],
    });
  };
  // Card title is the family label (group or subgroup) from
  // PLOT_GROUPS — same categorisation the "Select a Plot Tool"
  // picker uses. No hardcoded title dictionary.
  const family = useMemo(() => findFamilyForFeature(feature), [feature]);
  const title = family?.label || feature;
  const kpiProps = useMemo(() => buildKpiProps(summary), [summary]);
  const quickPickOptions = useMemo(
    () => getQuickPickOptions(feature),
    [feature],
  );

  // KPI (the strip + its action trio) can be dismissed independently
  // of the card itself. Card-level deletion is still available via
  // the bin in the title section. Local state only — hiding a KPI
  // strip isn't interesting enough to persist across reloads.
  const [kpiHidden, setKpiHidden] = useState(false);

  const cardInner = (
    <div style={cardStyle}>
      {/* ── Title section ───────────────────────────────────── */}
      <div style={titleSectionStyle}>
        <div style={featureTitleStyle}>{title}</div>
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
                onRefresh={handleRefreshKpi}
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
            {plots.map((plot) => (
              <PlotSlotCard
                key={plot.id}
                project={project}
                scenario={scenario}
                feature={feature}
                whatif={whatif}
                plotConfig={plot.plotConfig}
                onEdit={() => onEditPlot?.(plot.id)}
                onReset={() => onResetPlot?.(plot.id)}
                onDelete={
                  onDeletePlot ? () => onDeletePlot(plot.id) : undefined
                }
                onPlotReady={
                  onPlotReady
                    ? (plotDiv) => onPlotReady(plot.id, plotDiv)
                    : undefined
                }
              />
            ))}
            {onAddPlot && (
              <div style={plots.length > 0 ? addPlotRowWithDividerStyle : undefined}>
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

  return (
    <div style={outerStyle}>
      {/* Card fills its parent width (so it matches the map card at
          launch). The + right button overlays to the right via absolute
          positioning so the card's width stays intact. */}
      {cardInner}

      {/* + right — absolutely positioned just outside the card's right
          edge. Card width is not reduced by this button. */}
      {onAddCardRight && (
        <div style={plusRightWrapperStyle}>
          <PlusIconButton
            tooltip="Add a card to the right"
            onClick={onAddCardRight}
          />
        </div>
      )}

      {/* + bottom — regular flow child below the card, horizontally
          centered within the card's own width. */}
      {onAddCardBottom && (
        <div style={plusBottomWrapperStyle}>
          <PlusIconButton
            tooltip="Add a card below"
            onClick={onAddCardBottom}
          />
        </div>
      )}
    </div>
  );
};

/**
 * "+" button styled identically to the title card's "Add column"
 * affordance in ReportColumn.jsx — the `.cea-card-icon-button-container`
 * frame around a `type="text"` antd Button with CreateNewIcon.
 */
const PlusIconButton = ({ tooltip, onClick }) => (
  <div className="cea-card-icon-button-container">
    <Tooltip title={tooltip} placement="bottom">
      <Button
        type="text"
        icon={<CreateNewIcon />}
        onClick={onClick}
        aria-label={tooltip}
      />
    </Tooltip>
  </div>
);

/**
 * Single delete button in the FeatureCard title section — same
 * `cea-card-icon-button-container` outline as the KPI / plot trios
 * (one container, one button inside). Button is size 30×30 — exact
 * same as any individual icon in the grouped trios.
 */
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

/**
 * Edit / Refresh / Delete trio in the KPI section — same shared-
 * container pattern as the map card's toolbar and the plot section's
 * controls. `onEdit` is a placeholder (disabled when not wired);
 * `onRefresh` invalidates the KPI summary query; `onDelete` hides
 * just this KPI section (card-level deletion lives in the title).
 */
const KpiActionButtons = ({ onEdit, onRefresh, onDelete }) => (
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
    <Tooltip title="Refresh" placement="bottom">
      <Button
        type="text"
        icon={<RefreshIcon />}
        onClick={onRefresh}
        aria-label="Refresh KPI data"
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

// Outer: flex column holding the card on top, optional + bottom
// underneath, and a relatively-positioned context for the + right
// button which is absolutely positioned just outside the card's
// right edge. Keeps the card stretched to its parent's width (so it
// matches the map card) while the + right button adds to the side
// without reducing card width.
const outerStyle = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

// + right: 8px outside the card's right edge, vertically centered on
// the card. `left: 100%` puts it flush to the right edge; margin-left
// adds the spacer. Wrapper has no width so it hugs the button.
const plusRightWrapperStyle = {
  position: 'absolute',
  top: '50%',
  left: '100%',
  marginLeft: 8,
  transform: 'translateY(-50%)',
};

// + bottom: regular flow, horizontally centered within card width.
const plusBottomWrapperStyle = {
  display: 'flex',
  justifyContent: 'center',
};

// Shared minimum floor with the map card — see ReportColumn's
// `CARD_MIN_WIDTH` / `CARD_MIN_HEIGHT`. `box-sizing: border-box` is
// what makes minWidth/minHeight refer to the outer dimensions so a
// padded feature card and an unpadded map card land at the same
// visible size.
//
// Vertical padding matches the section `gap` (8px) so each button
// box sits the same distance below its immediate line above —
// whether that's the card's top border (title section) or a section
// divider (KPI / plot sections).
const cardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '8px 16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  resize: 'both',
  overflow: 'hidden',
  minWidth: 500,
  minHeight: 280,
};

const titleSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const featureTitleStyle = {
  fontWeight: 700,
  fontSize: 15,
  color: '#222',
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

// `flex: 1` + `minHeight: 0` lets the plot section absorb the
// card's remaining vertical space. Without `minHeight: 0` a flex
// child refuses to shrink below its content, and the plots would
// keep their 300px minimum even when the user drags the card
// shorter.
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

export default FeatureCard;

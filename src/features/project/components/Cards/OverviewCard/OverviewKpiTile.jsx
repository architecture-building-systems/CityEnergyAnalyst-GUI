/**
 * Compact landscape KPI tile rendered inside the OverviewCard's
 * `KpiRibbon`. Differs from the canvas's `FeatureCardKpi` (six
 * fixed rows + drag handle + replace/delete overlay) — this tile
 * is a single horizontal row sized to the OverviewCard panel
 * width: label + optional info icon on the left, value + unit on
 * the right.
 *
 * Shape:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ <KPI label> ⓘ                          <value> <unit>│
 *   └──────────────────────────────────────────────────────┘
 *
 * Multiple tiles stack vertically via the parent's grid /
 * flex column. Each tile owns its own `useFetchKpiValue` call
 * so per-tile `locatorArgs` overrides cache distinctly without
 * a feature-wide bulk fetch.
 *
 * Why a separate component instead of a "compact" prop on
 * `FeatureCardKpi`: the layouts are structurally different and
 * the canvas card carries a lot of chrome (drag handle, action
 * overlay, sparkline, delta chip) that the ribbon explicitly
 * doesn't want. Cleanest to keep them as siblings.
 */

import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

import { useFetchKpiValue } from 'features/canvas/hooks/useFetchKpis';
import { formatKpiNumber } from 'features/canvas/utils/formatKpiValue';

const OverviewKpiTile = ({ card, project, scenario, whatif }) => {
  const kpiId = card?.kpiId ?? null;
  const locatorArgs = card?.locatorArgs ?? null;

  const { data: kpi, isLoading, isError, error } = useFetchKpiValue({
    project,
    scenario,
    kpiId,
    locatorArgs,
    whatif,
  });

  if (!kpiId) return null;

  const available = !!kpi && kpi.available !== false;
  const valueText = available ? formatKpiNumber(kpi.value, kpi.unit) : '—';
  const showSkeleton = isLoading || !kpi;

  // Bottom-line hint string for unavailable / error states. Same
  // copy convention `FeatureCardKpi` uses, just rendered inline
  // beneath the label instead of as a third row at the bottom.
  let hint = null;
  if (isError) {
    hint = error?.message ?? 'Failed to load KPI';
  } else if (!showSkeleton && !available) {
    hint = kpi.upstream_tool
      ? `Run ${kpi.upstream_tool} to see this`
      : (kpi.reason ?? 'Not available');
  }

  return (
    <div style={tileStyle}>
      <div style={leftStyle}>
        <div style={labelLineStyle}>
          <span style={labelTextStyle} title={kpi?.label ?? kpiId}>
            {kpi?.label ?? '—'}
          </span>
          {kpi?.info_note && (
            <Tooltip
              title={<span style={tooltipBodyStyle}>{kpi.info_note}</span>}
              placement="top"
            >
              <InfoCircleOutlined
                style={infoIconStyle}
                aria-label="More info"
              />
            </Tooltip>
          )}
        </div>
        {hint && <div style={hintStyle}>{hint}</div>}
      </div>
      <div style={rightStyle}>
        <span style={available ? valueStyle : valueDimStyle}>
          {showSkeleton ? '\u00A0' : valueText}
        </span>
        <span style={unitStyle}>
          {showSkeleton ? '\u00A0' : (kpi?.unit ?? '')}
        </span>
      </div>
    </div>
  );
};

// Landscape row — `display: flex` with the left half flexing to
// fill and the right half hugging its content. The container
// matches the OverviewCard's other section rows (white surface,
// 1 px outline, 12 px radius) so the ribbon reads as one of the
// stack of section rows above it (Project / Scenario / Pathway).
const tileStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  boxSizing: 'border-box',
};

const leftStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const labelLineStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
};

const labelTextStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#222',
  lineHeight: 1.25,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const infoIconStyle = {
  fontSize: 11,
  color: '#94A3B8',
  cursor: 'help',
  flexShrink: 0,
};

// `whiteSpace: pre-wrap` keeps yml-authored newlines in the
// info_note (the formula sits on its own line by convention).
const tooltipBodyStyle = {
  whiteSpace: 'pre-wrap',
  lineHeight: 1.4,
};

const hintStyle = {
  fontSize: 11,
  color: '#888',
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const rightStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 4,
  flexShrink: 0,
};

const valueStyle = {
  fontSize: 20,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const valueDimStyle = {
  ...valueStyle,
  color: '#bbb',
};

const unitStyle = {
  fontSize: 11,
  color: '#666',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
};

export default OverviewKpiTile;

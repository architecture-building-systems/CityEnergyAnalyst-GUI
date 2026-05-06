/**
 * KPI card body — one card per KPI, no `FeatureCardShell`.
 *
 * Shape:
 *   <FeatureCardKpi
 *     card={{ id, type: 'kpi', kpiId: 'demand.eui_kwh_m2' }}
 *     project, scenario, whatif      // forwarded to useFetchKpis
 *     baseline={originColumnValue}   // compare-mode origin's value
 *     readOnly={false}               // KpiRibbon passes true
 *     onDeleteCard={() => removeCard(...)}
 *   />
 *
 * Card states (rendered identically by the same component):
 *   - loading        → skeleton bars in label / value slots
 *   - available      → label + big value + unit + (optional delta chip)
 *   - unavailable    → dim placeholder + "Run <upstream tool> to see this"
 *   - missing kpiId  → renders an empty placeholder; never throws
 *
 * Visual identity is intentionally minimal — no title bar, no
 * drag handle inside the body, no editing chrome. The card body
 * IS the number. Drag is handled by react-grid-layout's outer
 * wrapper through the `cea-card-drag-handle` class, attached
 * here only when the card is editable.
 *
 * Deletion: a hover-revealed `×` button top-right when
 * `enableEdit && !readOnly`. There's no edit drawer because
 * there's nothing to edit on a KPI card; pick a different
 * `kpiId` via the picker (Phase 2c).
 */

import { useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';

import { useCanvasStore } from '../stores/canvasStore';
import { useFetchKpis } from '../hooks/useFetchKpis';
import { formatKpiNumber } from '../utils/formatKpiValue';
import DeltaChip from './DeltaChip';

// `kpiId` shape is `<feature>.<short_name>` — split once so we
// can fetch the right feature endpoint and render the feature
// label as the small grey prefix. Caller doesn't pass feature
// separately; the id is the source of truth.
const splitKpiId = (kpiId) => {
  if (!kpiId || typeof kpiId !== 'string') return [null, null];
  const dotIdx = kpiId.indexOf('.');
  if (dotIdx <= 0) return [null, null];
  return [kpiId.slice(0, dotIdx), kpiId.slice(dotIdx + 1)];
};

// Capitalise the feature segment for display ("demand" → "Demand").
const titleCase = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const FeatureCardKpi = ({
  card,
  project,
  scenario,
  whatif,
  baseline,
  readOnly = false,
  onDeleteCard,
}) => {
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const showDeltas = useCanvasStore((s) => s.showKpiDeltas);
  const [hovered, setHovered] = useState(false);

  const kpiId = card?.kpiId ?? null;
  const [feature] = splitKpiId(kpiId);

  const { data, isLoading, isError, error } = useFetchKpis(
    project,
    scenario,
    feature,
    whatif,
  );

  // Pull just this card's KPI out of the feature-level response.
  // The hook caches at the feature level so multiple KPI cards in
  // the same feature share the same fetch.
  const kpi = useMemo(
    () => (data?.kpis ?? []).find((k) => k.id === kpiId) ?? null,
    [data, kpiId],
  );

  const showCardActions = enableEdit && !readOnly;

  // No id → render an empty card. Should not happen in practice
  // (the picker always supplies one) but defends against stale
  // saves where the registry no longer carries a referenced id.
  if (!kpiId) {
    return (
      <div style={cardStyle}>
        <div style={emptyStyle}>No KPI selected</div>
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      className={
        showCardActions ? 'cea-card-drag-handle cea-kpi-card' : 'cea-kpi-card'
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover-revealed delete. Hidden in Export View / read-only
          (KpiRibbon). Stops drag-event propagation so clicking
          the close button never accidentally drags the card. */}
      {showCardActions && hovered && onDeleteCard && (
        <button
          type="button"
          aria-label="Delete KPI card"
          style={deleteButtonStyle}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteCard();
          }}
        >
          <CloseOutlined style={{ fontSize: 12 }} />
        </button>
      )}

      <KpiBody
        kpi={kpi}
        feature={feature}
        kpiId={kpiId}
        isLoading={isLoading}
        isError={isError}
        error={error}
        baseline={baseline}
        showDeltas={showDeltas && !readOnly}
      />
    </div>
  );
};

// Body splits into four logical regions stacked vertically:
//   1. Label row (feature prefix + KPI label + info icon)
//   2. Value (big number)
//   3. Unit (one line under)
//   4. Delta chip OR upstream-tool hint (mutually exclusive)
const KpiBody = ({
  kpi,
  feature,
  kpiId,
  isLoading,
  isError,
  error,
  baseline,
  showDeltas,
}) => {
  if (isError) {
    return (
      <>
        <Label feature={feature} label={fallbackLabel(kpiId)} />
        <ValuePlaceholder />
        <div style={hintStyle}>{error?.message ?? 'Failed to load KPI'}</div>
      </>
    );
  }

  if (isLoading || !kpi) {
    return (
      <>
        <Label feature={feature} label={fallbackLabel(kpiId)} loading />
        <ValuePlaceholder loading />
      </>
    );
  }

  const available = kpi.available !== false;

  return (
    <>
      <Label
        feature={feature}
        label={kpi.label ?? fallbackLabel(kpiId)}
        infoNote={kpi.info_note}
      />
      <div style={available ? valueStyle : valueDimStyle}>
        {available ? formatKpiNumber(kpi.value, kpi.unit) : '—'}
      </div>
      <div style={unitStyle}>{kpi.unit ?? ''}</div>
      {available && showDeltas && baseline != null && (
        <div style={deltaRowStyle}>
          <DeltaChip
            value={kpi.value}
            baseline={baseline}
            betterDirection={kpi.better_direction}
          />
        </div>
      )}
      {!available && (
        <div style={hintStyle}>
          {kpi.upstream_tool
            ? `Run ${kpi.upstream_tool} to see this`
            : kpi.reason ?? 'Not available'}
        </div>
      )}
    </>
  );
};

const Label = ({ feature, label, infoNote, loading = false }) => {
  if (loading) {
    return <div style={{ ...labelStyle, ...skeletonLabelStyle }}>&nbsp;</div>;
  }
  return (
    <div style={labelStyle}>
      {feature && (
        <>
          <span style={featurePrefixStyle}>{titleCase(feature)}</span>
          <span style={featureDotStyle}>·</span>
        </>
      )}
      <span style={labelTextStyle}>{label}</span>
      {infoNote && (
        <Tooltip title={infoNote} placement="top">
          <InfoCircleOutlined style={infoIconStyle} aria-label="More info" />
        </Tooltip>
      )}
    </div>
  );
};

const ValuePlaceholder = ({ loading = false }) => (
  <div
    style={{
      ...valueDimStyle,
      ...(loading ? skeletonValueStyle : null),
    }}
  >
    {loading ? '\u00A0' : '—'}
  </div>
);

// Fallback label when fetch is in flight or registry doesn't
// carry a `label` field — derive a readable string from the id
// (`demand.eui_kwh_m2` → `eui_kwh_m2`) so the card never goes
// completely blank during loading.
const fallbackLabel = (kpiId) => splitKpiId(kpiId)[1] ?? '';

// ── Styles ──────────────────────────────────────────────────────────

const cardStyle = {
  position: 'relative',
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '12px 16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 4,
  fontSize: 11,
  color: '#666',
  fontWeight: 500,
  lineHeight: 1.3,
};

const featurePrefixStyle = {
  color: '#888',
};

const featureDotStyle = {
  color: '#bbb',
  margin: '0 2px',
};

const labelTextStyle = {
  color: '#222',
};

const infoIconStyle = {
  fontSize: 11,
  color: '#94A3B8',
  marginLeft: 2,
  cursor: 'help',
};

const valueStyle = {
  fontSize: 28,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.1,
  marginTop: 4,
  fontVariantNumeric: 'tabular-nums',
};

const valueDimStyle = {
  ...valueStyle,
  color: '#bbb',
};

const unitStyle = {
  fontSize: 12,
  color: '#666',
  lineHeight: 1.2,
};

const deltaRowStyle = {
  marginTop: 'auto',
  paddingTop: 4,
};

const hintStyle = {
  fontSize: 11,
  color: '#888',
  marginTop: 'auto',
  lineHeight: 1.3,
};

const emptyStyle = {
  fontSize: 12,
  color: '#bbb',
  fontStyle: 'italic',
  textAlign: 'center',
  alignSelf: 'center',
  margin: 'auto',
};

const deleteButtonStyle = {
  position: 'absolute',
  top: 6,
  right: 6,
  width: 20,
  height: 20,
  border: 'none',
  background: 'rgba(255, 255, 255, 0.9)',
  borderRadius: 4,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#666',
  padding: 0,
};

// Skeleton bars — flat dim grey is enough; the layout stays
// stable while loading and React Query's <1s typical first-paint
// makes a shimmer animation overkill.
const skeletonLabelStyle = {
  width: '60%',
  background: '#f0f0f0',
  borderRadius: 4,
};

const skeletonValueStyle = {
  background: '#f4f4f4',
  borderRadius: 6,
  width: '50%',
};

export default FeatureCardKpi;

/**
 * KPI card body — one card per KPI, no `FeatureCardShell`.
 *
 * Shape:
 *   <FeatureCardKpi
 *     card={{ id, type: 'kpi', kpiId: 'demand.eui_kwh_m2' }}
 *     project, scenario, whatif      // forwarded to useFetchKpis
 *     originScenario={originPath}    // compare-mode origin's scenario
 *     readOnly={false}               // KpiRibbon passes true
 *     onDeleteCard={() => removeCard(...)}
 *   />
 *
 * Compare-mode baseline: the card fetches the origin scenario's
 * same KPI via a second `useFetchKpis` call. React Query keys
 * include the scenario, so the origin column's prior fetch
 * already populates the cache — non-origin cards pay no extra
 * network round-trip. The fetch is skipped (hook disabled) when
 * `originScenario` is null or matches this card's own scenario.
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
import { useFetchKpis, useFetchKpiSparkline } from '../hooks/useFetchKpis';
import { formatKpiNumber } from '../utils/formatKpiValue';
import DeltaChip from './DeltaChip';
import KpiSparkline from './KpiSparkline';

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
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const FeatureCardKpi = ({
  card,
  project,
  scenario,
  whatif,
  originScenario = null,
  readOnly = false,
  onDeleteCard,
}) => {
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const showDeltas = useCanvasStore((s) => s.showKpiDeltas);
  const comparisonSetup = useCanvasStore((s) => s.comparisonSetup);
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

  // Compare-mode baseline. Only fires when:
  //   - `originScenario` is set (compare mode)
  //   - it differs from this card's own scenario (origin column
  //     diffing against itself would always be 0%)
  //   - `showDeltas` is on (no point fetching if the chip won't
  //     render)
  // React Query's `enabled` flag uses null-fall-through so the
  // call is fully skipped on origin / non-compare / non-readonly
  // ribbons. Same query key as the origin column → cache hit.
  const wantBaseline =
    showDeltas && !readOnly && !!originScenario && originScenario !== scenario;
  const { data: originData } = useFetchKpis(
    project,
    wantBaseline ? originScenario : null,
    wantBaseline ? feature : null,
    whatif,
  );
  const baselineKpi = useMemo(
    () =>
      wantBaseline
        ? ((originData?.kpis ?? []).find((k) => k.id === kpiId) ?? null)
        : null,
    [wantBaseline, originData, kpiId],
  );
  const baseline = baselineKpi?.available !== false ? baselineKpi?.value : null;

  // Pathway sparkline: only for headline KPIs in pathway-single
  // mode. The hook fans out per-state-year fetches and React
  // Query dedupes against this card's column-level fetch.
  // Pathway-multi has its own row layout (no FeatureCardKpi
  // instances), so only `pathway-single` is in scope here.
  const isPathwaySingle = comparisonSetup?.kind === 'pathway-single';
  const pathwayName = isPathwaySingle ? comparisonSetup?.pathwayName : null;
  const stateYears = isPathwaySingle ? comparisonSetup?.stateYears : null;
  const parentScenario = isPathwaySingle
    ? (comparisonSetup?.parentScenario ?? null)
    : null;
  const wantSparkline =
    isPathwaySingle &&
    !!kpi &&
    kpi.headline === true &&
    kpi.available !== false &&
    Array.isArray(stateYears) &&
    stateYears.length > 1;
  const { points: sparklinePoints } = useFetchKpiSparkline({
    project,
    pathwayName: wantSparkline ? pathwayName : null,
    parentScenario: wantSparkline ? parentScenario : null,
    stateYears: wantSparkline ? stateYears : null,
    feature,
    kpiId,
    whatif,
  });

  // Highlight the data point for THIS card's own state-year so
  // the user can see "this card = this point on the trend".
  // Parses the year out of the card's scenario path (state_2030
  // → 2030); falls back to the last point's year if the path
  // doesn't match the expected shape.
  const cardYear = useMemo(() => {
    if (!scenario) return null;
    const m = String(scenario).match(/state_(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }, [scenario]);

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
      // The "feature focus" landing flow (`useFocusFeature`) finds
      // the first KPI card matching the URL's feature segment via
      // `[data-card-id]` and scrolls + flashes it. Plot / Map cards
      // don't carry this attribute because the focus flow is
      // KPI-only.
      data-card-id={card.id}
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
        sparklinePoints={wantSparkline ? sparklinePoints : null}
        cardYear={cardYear}
      />
    </div>
  );
};

// Fixed six-row layout — every KPI card renders these rows in
// the same vertical positions regardless of card dimensions, so
// users scanning a grid of cards always find the value at the
// same eye-line:
//
//   row 1 — feature label  (e.g. "Demand")
//   row 2 — KPI name line 1
//   row 3 — KPI name line 2 (the name is clamped to 2 lines max;
//           short names render in row 2 with row 3 empty)
//   row 4 — info icon (or empty cell when no info_note)
//   row 5 — value (the metric)
//   row 6 — unit
//
// Compare-mode delta chip / sparkline / unavailable hint render
// BELOW row 6 — so they're optional add-ons, not replacements
// for any of the fixed rows. At cramped sizes (2×3 launch
// default) the bottom rows clip via the card's `overflow: hidden`,
// rather than reshuffling — the row order itself is locked.
const KpiBody = ({
  kpi,
  feature,
  kpiId,
  isLoading,
  isError,
  error,
  baseline,
  showDeltas,
  sparklinePoints,
  cardYear,
}) => {
  const available = !!kpi && kpi.available !== false;
  const label = kpi?.label ?? fallbackLabel(kpiId);
  const infoNote = kpi?.info_note;
  const valueText = available ? formatKpiNumber(kpi.value, kpi.unit) : '—';
  const showSkeleton = isLoading || !kpi;

  return (
    <>
      {/* Row 1 — feature */}
      <div style={featureRowStyle}>
        {feature ? titleCase(feature) : '\u00A0'}
      </div>

      {/* Rows 2–3 — KPI name (2-line clamp) */}
      <div style={nameRowStyle} title={label}>
        {showSkeleton ? '\u00A0' : label}
      </div>

      {/* Row 4 — info icon (left) + optional delta chip (right).
          Always reserves the row height so the value and unit
          don't shift up when a KPI carries no `info_note`. The
          delta chip lives on the same row, pushed to the right
          edge with `margin-left: auto`, so it's visible at the
          launch size without forcing the user to drag the card
          taller. */}
      <div style={infoRowStyle}>
        {infoNote && !showSkeleton && (
          <Tooltip
            title={<span style={tooltipBodyStyle}>{infoNote}</span>}
            placement="top"
          >
            <InfoCircleOutlined style={infoIconStyle} aria-label="More info" />
          </Tooltip>
        )}
        {!showSkeleton && available && showDeltas && baseline != null && (
          <div style={infoRowDeltaStyle}>
            <DeltaChip
              value={kpi.value}
              baseline={baseline}
              betterDirection={kpi.better_direction}
            />
          </div>
        )}
      </div>

      {/* Row 5 — value */}
      <div style={available ? valueStyle : valueDimStyle}>
        {showSkeleton ? '\u00A0' : valueText}
      </div>

      {/* Row 6 — unit */}
      <div style={unitStyle}>{showSkeleton ? '\u00A0' : (kpi?.unit ?? '')}</div>

      {/* Optional add-ons below the fixed six rows */}
      {isError && (
        <div style={hintStyle}>{error?.message ?? 'Failed to load KPI'}</div>
      )}
      {!showSkeleton && !isError && !available && (
        <div style={hintStyle}>
          {kpi.upstream_tool
            ? `Run ${kpi.upstream_tool} to see this`
            : (kpi.reason ?? 'Not available')}
        </div>
      )}
      {!showSkeleton && available && sparklinePoints && (
        <KpiSparkline
          points={sparklinePoints}
          highlightYear={cardYear}
          betterDirection={kpi.better_direction}
        />
      )}
    </>
  );
};

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
  padding: '8px 12px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  // Row gap is intentionally tight — the six fixed rows have
  // their own min-heights / line-heights, so this controls the
  // breathing room *between* them. Content overflows past the
  // bottom rather than reshuffling when the card is shorter
  // than the rows want.
  gap: 2,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

// ── Fixed-row styles ────────────────────────────────────────────────
// Every row carries a `flex: '0 0 auto'` (implicit via not setting
// flex) plus an explicit min-height so the row's vertical position
// stays stable across card sizes. The card body itself is a flex
// column with `overflow: hidden`, so when a card is narrower /
// shorter than the rows want, content clips at the bottom rather
// than reshuffling vertically.

const featureRowStyle = {
  fontSize: 10,
  color: '#888',
  fontWeight: 500,
  lineHeight: 1.3,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const nameRowStyle = {
  fontSize: 12,
  color: '#222',
  fontWeight: 600,
  lineHeight: 1.25,
  // Two-line clamp (rows 2–3). Short names render in row 2 with
  // row 3 empty; long names truncate with an ellipsis at the end
  // of line 2 so the value below never shifts down.
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  // Reserve two lines' worth of height even when the name only
  // takes one line — keeps row 4 (info icon) at the same y across
  // every card.
  minHeight: 30,
};

const infoRowStyle = {
  display: 'flex',
  alignItems: 'center',
  // The delta chip lives on this same row in compare mode; the
  // gap keeps it off the info icon, and the chip's wrapper uses
  // `marginLeft: auto` to push it to the right edge.
  gap: 6,
  // Fixed `height` (not `minHeight`) so the row stays the same y
  // whether or not the delta chip is present. `overflow: hidden`
  // clips the chip's tail rather than letting it inflate the row
  // and shift rows 5–6 (value + unit) downward.
  height: 18,
  overflow: 'hidden',
};

const infoRowDeltaStyle = {
  marginLeft: 'auto',
  // Delta chip needs to clip cleanly at the card's right edge
  // when the card is narrow — `min-width: 0` lets the parent
  // flex-row shrink the chip's container instead of bulging the
  // whole row.
  minWidth: 0,
  overflow: 'hidden',
};

const infoIconStyle = {
  fontSize: 12,
  color: '#94A3B8',
  cursor: 'help',
};

// `whiteSpace: pre-wrap` keeps yml-authored newlines visible — so
// a multi-line `info_note` with a formula on its own line renders
// as the author intended. Sans-serif font; Unicode math glyphs
// (Σ Δ ÷ × ² ³ ₁ ₂ Greek) render fine in the default font and
// don't need a separate monospace family.
const tooltipBodyStyle = {
  whiteSpace: 'pre-wrap',
  lineHeight: 1.4,
};

const valueStyle = {
  fontSize: 26,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.1,
  marginTop: 2,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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

export default FeatureCardKpi;

/**
 * KPI card body — canvas variant. One card per KPI, no
 * `FeatureCardShell`.
 *
 * Shape:
 *   <FeatureCardKpi
 *     card={{ id, type: 'kpi', kpiId, locatorArgs }}
 *     project, scenario, whatif        // fetch context
 *     originScenario={originPath}      // compare-mode origin's scenario
 *     readOnly={false}                 // suppress editing chrome
 *     onDeleteCard={() => removeCard(...)}
 *     onReplaceCard={() => openPicker(card)}
 *   />
 *
 * Per-card fetch via ``useFetchKpiValue`` — the query key
 * includes ``card.locatorArgs`` so two cards on the same
 * ``kpiId`` but different overrides cache distinctly. Compare-
 * mode baseline (delta chip) fires a second ``useFetchKpiValue``
 * against ``originScenario``; React Query dedupes against the
 * origin column's own fetch.
 *
 * Card states (rendered identically by the same component):
 *   - loading        → skeleton spaces in label / value slots
 *   - available      → label + big value + unit + (optional delta chip)
 *   - unavailable    → dim placeholder + "Run <upstream tool> to see this"
 *   - missing kpiId  → renders an empty placeholder; never throws
 *
 * Editing affordances (only when ``enableEdit && !readOnly``):
 *   - Hover-revealed × top-right for quick delete.
 *   - Click anywhere on the card → inline action overlay with
 *     Replace + Delete icons painted over the body. Mouse-leave
 *     dismisses; clicking either icon fires its handler.
 *
 * Drag/resize follows the FeatureCardShell convention — the
 * ``cea-card-drag-handle`` class is gated on ``fixLayout`` only,
 * so layout edits are independent of the editing-affordance
 * switch (``enableEdit``).
 */

import { useMemo, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';

import { BinAnimationIcon, InputEditorIcon } from 'assets/icons';
import { useCanvasStore } from '../stores/canvasStore';
import { useFetchKpiSparkline, useFetchKpiValue } from '../hooks/useFetchKpis';
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

// Capitalise the feature segment for display, splitting on the
// underscore / hyphen separators yml authors use to compound
// multi-word feature names. Examples:
//   "demand"          → "Demand"
//   "heat_rejection"  → "Heat Rejection"
//   "final_energy"    → "Final Energy"
// Bare titleCase would have rendered "Heat_rejection" with the
// underscore preserved.
const titleCase = (s) =>
  s
    ? s
        .split(/[_-]/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : s;

const FeatureCardKpi = ({
  card,
  project,
  scenario,
  whatif,
  originScenario = null,
  readOnly = false,
  onDeleteCard,
  // Click-to-replace handler. When set + the card is editable,
  // clicking the card surface flips an inline overlay with two
  // actions (Edit-icon / Delete-icon) painted directly on top
  // of the KPI body. When unset, the card stays click-inert
  // (used by OverviewCard ribbon and the read-only KpiRibbon).
  onReplaceCard,
}) => {
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  // Layout drag/resize is independent of `enableEdit` — matches
  // `FeatureCardShell`'s convention for Plot / Map cards. Only
  // `fixLayout` freezes the drag handle so users can lay out a
  // KPI dashboard, then flip Export View off without losing the
  // ability to rearrange.
  const layoutLocked = useCanvasStore((s) => s.fixLayout);
  const showDeltas = useCanvasStore((s) => s.showKpiDeltas);
  const comparisonSetup = useCanvasStore((s) => s.comparisonSetup);
  // Coordinated through the store so only one KPI card's overlay
  // is open at a time, and so PerimeterPlusButtons can hide every
  // card-add affordance while ANY KPI card is in action mode.
  const activeKpiActionsCardId = useCanvasStore(
    (s) => s.activeKpiActionsCardId,
  );
  const setActiveKpiActionsCardId = useCanvasStore(
    (s) => s.setActiveKpiActionsCardId,
  );
  const [hovered, setHovered] = useState(false);
  const actionsOpen = !!card?.id && activeKpiActionsCardId === card.id;

  const kpiId = card?.kpiId ?? null;
  const locatorArgs = card?.locatorArgs ?? null;
  const [feature] = splitKpiId(kpiId);

  // Per-card single-KPI fetch. The query key includes
  // ``locatorArgs`` so two cards with the same KPI but different
  // overrides (e.g. monocrystalline vs amorphous solar) cache
  // separately.
  const {
    data: kpi,
    isLoading,
    isError,
    error,
  } = useFetchKpiValue({
    project,
    scenario,
    kpiId,
    locatorArgs,
    whatif,
  });

  // Compare-mode baseline. Only fires when:
  //   - `originScenario` is set (compare mode)
  //   - it differs from this card's own scenario (origin column
  //     diffing against itself would always be 0%)
  //   - `showDeltas` is on (no point fetching if the chip won't
  //     render)
  // React Query's `enabled` flag uses null-fall-through so the
  // call is fully skipped on origin / non-compare / non-readonly
  // ribbons. Same `locatorArgs` is forwarded so the baseline reads
  // the same configuration as this card.
  const wantBaseline =
    showDeltas && !readOnly && !!originScenario && originScenario !== scenario;
  const { data: baselineKpi } = useFetchKpiValue({
    project,
    scenario: wantBaseline ? originScenario : null,
    kpiId: wantBaseline ? kpiId : null,
    locatorArgs,
    whatif,
  });
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

  // Whether the inline action overlay is active. When true the
  // body stays mounted underneath but a white surface covers the
  // KPI numbers and two icon buttons paint over the centre.
  const showOverlay = showCardActions && !!onReplaceCard && actionsOpen;

  // Click anywhere on the card surface toggles the overlay (when
  // the card is editable + has a Replace handler). Goes through
  // the canvas store so opening one card's overlay closes any
  // other card's overlay automatically.
  const handleCardClick = () => {
    if (!showCardActions || !onReplaceCard) return;
    setActiveKpiActionsCardId(actionsOpen ? null : card.id);
  };

  // Cursor leaves the card → close the overlay. This is the
  // primary dismissal gesture (no need for explicit click-out
  // detection on the overlay surface). When some other card
  // owns the active slot, leaving this one is a no-op.
  const handleCardMouseLeave = () => {
    setHovered(false);
    if (actionsOpen) setActiveKpiActionsCardId(null);
  };

  return (
    <div
      style={cardStyle}
      className={
        // Drag handle gated on `fixLayout` only — matches the
        // FeatureCardShell pattern. `enableEdit` controls
        // editing affordances (delete, replace overlay), not
        // drag/resize.
        layoutLocked ? 'cea-kpi-card' : 'cea-card-drag-handle cea-kpi-card'
      }
      // The "feature focus" landing flow (`useFocusFeature`) finds
      // the first KPI card matching the URL's feature segment via
      // `[data-card-id]` and scrolls + flashes it. Plot / Map cards
      // don't carry this attribute because the focus flow is
      // KPI-only.
      data-card-id={card.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleCardMouseLeave}
      onClick={handleCardClick}
    >
      {/* Hover-revealed close. Hidden when the action overlay is
          active (the overlay's Delete button takes its place).
          Stops drag-event propagation so clicking the close
          button never accidentally drags the card or opens the
          overlay behind it. */}
      {showCardActions && hovered && !actionsOpen && onDeleteCard && (
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

      {showOverlay && (
        <CardActions
          onReplace={() => {
            setActiveKpiActionsCardId(null);
            onReplaceCard();
          }}
          onDelete={
            onDeleteCard
              ? () => {
                  setActiveKpiActionsCardId(null);
                  onDeleteCard();
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

// Inline action overlay — paints a white surface over the KPI
// body and centres a shared icon-button container (matches the
// `cea-card-icon-button-container` convention used by
// `PlotSlotCard` / `FeatureCardShell` so the outline reads as
// the same family across the app). Two borderless antd Buttons
// inside; the container itself owns the 1 px grey outline.
//
// Dismissal: cursor leaving the card (handled by the parent's
// `onMouseLeave`) closes the overlay. The buttons stop
// propagation so action clicks only fire their own handler;
// `pointerdown` is also stopped so rgl's drag-handle doesn't
// catch button presses as drag attempts.
const CardActions = ({ onReplace, onDelete }) => (
  <div
    style={overlayStyle}
    onPointerDown={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
  >
    <div className="cea-card-icon-button-container">
      {onReplace && (
        <Tooltip title="Replace KPI">
          <Button
            type="text"
            icon={<InputEditorIcon />}
            aria-label="Replace KPI"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onReplace();
            }}
          />
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip title="Delete card">
          <Button
            type="text"
            icon={<BinAnimationIcon />}
            aria-label="Delete card"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
        </Tooltip>
      )}
    </div>
  </div>
);

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

// Inline action overlay — white surface that covers the KPI
// body to its rounded edges. The two icon buttons are
// horizontally centred so the surface reads as "the card has
// switched into edit-mode" rather than "a popover floats above
// it". `inset: 0` makes the overlay match whatever the card's
// current size is (resizing the card resizes the overlay too).
const overlayStyle = {
  position: 'absolute',
  inset: 0,
  background: '#fff',
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  // Sits above the KpiBody (no explicit z-index needed since
  // sibling order does the work) but matches the parent's
  // overflow:hidden so the white surface doesn't bleed past the
  // card edge.
};

export default FeatureCardKpi;

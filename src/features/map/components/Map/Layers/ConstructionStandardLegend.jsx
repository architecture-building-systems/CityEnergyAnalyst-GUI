import { useMapStore, COLOR_MODES } from 'features/map/stores/mapStore';
import InfoTooltip from 'components/InfoTooltip';

/**
 * Legend component that displays construction archetype or main use type colors.
 * Shows a color swatch + label + GFA breakdown for each unique
 * category — e.g. ``STANDARD5  34,000 m² (100%)``.
 *
 * `style` is merged on top of the defaults so callers can override
 * width / chrome / spacing — e.g. Canvas Builder embeds this legend inline
 * under the column's overview map and drops the floating-card chrome.
 *
 * `constructionColorMapOverride` / `useTypeColorMapOverride` let
 * callers supply per-source maps instead of reading from the
 * singleton — used by Canvas Builder so each compare-mode column's
 * legend reflects its own scenario's archetypes (Zurich's "STANDARD3"
 * isn't necessarily Singapore's). Omitting the overrides falls back
 * to the singleton, so the main viewport behaves as before.
 *
 * `constructionGfaTotalsOverride` / `useTypeGfaTotalsOverride`
 * follow the same per-column override pattern. The GFA totals are
 * computed alongside the colour maps when zone data lands; legend
 * renders ``<m²> (<%>%)`` next to each entry so users see the
 * district's footprint distribution at a glance.
 */
const ConstructionStandardLegend = ({
  style,
  constructionColorMapOverride,
  useTypeColorMapOverride,
  constructionGfaTotalsOverride,
  useTypeGfaTotalsOverride,
}) => {
  const colorMode = useMapStore((state) => state.colorMode);
  const singletonConstruction = useMapStore(
    (state) => state.constructionColorMap,
  );
  const singletonUseType = useMapStore((state) => state.useTypeColorMap);
  const singletonConstructionTotals = useMapStore(
    (state) => state.constructionGfaTotals,
  );
  const singletonUseTypeTotals = useMapStore((state) => state.useTypeGfaTotals);
  const constructionColorMap =
    constructionColorMapOverride ?? singletonConstruction;
  const useTypeColorMap = useTypeColorMapOverride ?? singletonUseType;
  const constructionGfaTotals =
    constructionGfaTotalsOverride ?? singletonConstructionTotals;
  const useTypeGfaTotals = useTypeGfaTotalsOverride ?? singletonUseTypeTotals;

  const isConstruction = colorMode === COLOR_MODES.CONSTRUCTION_STANDARD;
  const isUseType = colorMode === COLOR_MODES.USE_TYPE;

  if (!isConstruction && !isUseType) {
    return null;
  }

  const colorMap = isConstruction ? constructionColorMap : useTypeColorMap;
  const gfaTotals = isConstruction ? constructionGfaTotals : useTypeGfaTotals;
  const title = isConstruction ? 'Construction Archetypes' : 'Main Use Types';
  // Sort entries by descending GFA — biggest contributor first
  // matches what users actually want to see ("which type
  // dominates this district?"). When totals aren't available
  // (zone data hasn't loaded the GFA yet), fall back to alphabetical
  // so the legend doesn't reshuffle on first paint.
  const entries = Object.keys(colorMap).sort((a, b) => {
    const ag = gfaTotals?.[a]?.gfa;
    const bg = gfaTotals?.[b]?.gfa;
    if (ag != null && bg != null && ag !== bg) return bg - ag;
    return a.localeCompare(b);
  });

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="cea-overlay-card construction-standard-legend"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        padding: 12,
        width: 280,
        maxHeight: 200,
        ...style,
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          fontSize: 13,
          marginBottom: 8,
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: 6,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {title}
        <InfoTooltip
          tooltipKey={
            isConstruction
              ? 'construction-archetypes-info'
              : 'main-use-type-info'
          }
          style={{ color: '#999' }}
        />
      </div>

      <div
        style={{
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {entries.map((entry) => (
          <LegendItem
            key={entry}
            color={colorMap[entry]}
            label={entry}
            totals={gfaTotals?.[entry]}
          />
        ))}
      </div>
    </div>
  );
};

// `Intl.NumberFormat` instance reused across renders — formatting
// is the dominant cost in long legends and a single instance is
// the documented fast path. ``34000`` → ``"34,000"``.
const GFA_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const formatTotals = (totals) => {
  if (!totals) return null;
  const gfa = Number.isFinite(totals.gfa)
    ? GFA_FORMATTER.format(totals.gfa)
    : '—';
  // Show the percentage to one decimal when it would round to
  // 0 % — distinguishes "tiny but present" from "absent". Round
  // to whole percent otherwise; 100 % stays 100.
  let pctStr;
  if (!Number.isFinite(totals.pct)) {
    pctStr = '—';
  } else if (totals.pct < 0.5 && totals.pct > 0) {
    pctStr = totals.pct.toFixed(1);
  } else {
    pctStr = Math.round(totals.pct).toString();
  }
  return `${gfa} m² (${pctStr}%)`;
};

/**
 * Individual legend item — colour swatch + label on the left,
 * GFA total + share on the right (when available). The two-
 * column flex layout lets the label flex / ellipsis-truncate
 * while the value column hugs its content on the right.
 */
const LegendItem = ({ color, label, totals }) => {
  const valueText = formatTotals(totals);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          // Matches the status-legend dot in PathwayPanel
          // (12 × 12 circle) so the two legend chromes read as
          // one family across the app.
          width: 12,
          height: 12,
          backgroundColor: color,
          borderRadius: 999,
          border: '1px solid rgba(0, 0, 0, 0.2)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={label}
      >
        {label}
      </span>
      {valueText && (
        <span
          style={{
            fontSize: 11,
            color: '#666',
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
          }}
          title={valueText}
        >
          {valueText}
        </span>
      )}
    </div>
  );
};

export default ConstructionStandardLegend;

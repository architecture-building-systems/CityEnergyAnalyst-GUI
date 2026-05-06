/**
 * `KpiRibbon` — read-only horizontal strip of headline KPIs under
 * the OverviewCard. Lives in the main project viewport, NOT the
 * Canvas Builder.
 *
 *   <KpiRibbon project="..." scenario="..." />
 *
 * Behaviour:
 *  - Reads the headline subset across every registered feature for
 *    the active scenario.
 *  - Hides itself entirely when no headline KPI has data (per the
 *    locked decision: never show a row of empty tiles).
 *  - Each tile is a compact label + value + unit, NO chrome
 *    (`FeatureCardKpi` is canvas-card-shaped — overkill here, the
 *    ribbon's tiles are dense and uniform).
 *  - Click → navigate to the canvas with `focusFeature` carried
 *    on the route state. The canvas can then act on it later if
 *    desired; v1 simply lands the user on the canvas with the
 *    feature in the URL hash for future use.
 *
 * The ribbon collapses into a single horizontal row that overflows
 * with its own scroll bar — at six headlines × ~140 px per tile the
 * total width is comfortably wider than typical OverviewCard
 * content, so horizontal scroll is the right escape hatch instead
 * of wrapping into multiple lines.
 */

import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

import routes from 'constants/routes.json';
import useNavigationStore from 'stores/navigationStore';

import { useFetchHeadlineKpis } from 'features/canvas/hooks/useFetchKpis';
import { formatKpiNumber } from 'features/canvas/utils/formatKpiValue';

const titleCase = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const KpiRibbon = ({ project, scenario, whatif }) => {
  const { headlineKpis, totalHeadlines, allUnavailable, isLoading } =
    useFetchHeadlineKpis(project, scenario, whatif);
  const { push } = useNavigationStore();

  // Hide the entire ribbon when:
  //  - registry has no headlines registered (yml hasn't shipped any
  //    yet), OR
  //  - every headline came back unavailable (no upstream tools have
  //    run).
  // First-load loading state shows a one-line placeholder so the
  // ribbon footprint stays stable instead of popping in/out as the
  // queries resolve.
  if (totalHeadlines === 0) return null;
  if (!isLoading && allUnavailable) return null;

  const handleTileClick = (kpi) => {
    // Navigate to the canvas with the tile's feature carried on
    // the route hash. The canvas itself doesn't yet read this
    // (Phase 2g v1 ships navigation only); the param is parked
    // for the follow-up that wires "feature focus" on the canvas
    // landing.
    push(`${routes.CANVAS}?focusFeature=${encodeURIComponent(kpi.category)}`);
  };

  return (
    <div style={ribbonStyle} aria-label="Key Performance Indicators">
      <div style={headerStyle}>
        <span style={headerLabelStyle}>Key Indicators</span>
        <span style={headerCountStyle}>
          {headlineKpis.length}/{totalHeadlines}
        </span>
      </div>
      <div style={rowStyle}>
        {isLoading && headlineKpis.length === 0 ? (
          <div style={placeholderStyle}>Loading…</div>
        ) : (
          headlineKpis.map((kpi) => (
            <RibbonTile
              key={kpi.id}
              kpi={kpi}
              onClick={() => handleTileClick(kpi)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const RibbonTile = ({ kpi, onClick }) => {
  const numText = formatKpiNumber(kpi.value, kpi.unit);
  return (
    <button
      type="button"
      style={tileStyle}
      onClick={onClick}
      aria-label={`Open ${kpi.label} on the canvas`}
      title={kpi.label}
    >
      <div style={tileLabelStyle}>
        <span style={tileFeaturePrefixStyle}>{titleCase(kpi.category)}</span>
        <span style={tileFeatureDotStyle}>·</span>
        <span style={tileLabelTextStyle}>{kpi.label}</span>
        {kpi.info_note && (
          <Tooltip
            title={<span style={tooltipBodyStyle}>{kpi.info_note}</span>}
            placement="top"
          >
            <InfoCircleOutlined
              style={tileInfoIconStyle}
              aria-label="More info"
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        )}
      </div>
      <div style={tileValueStyle}>{numText}</div>
      <div style={tileUnitStyle}>{kpi.unit ?? ''}</div>
    </button>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const ribbonStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginTop: 8,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const headerLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#444',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const headerCountStyle = {
  fontSize: 10,
  color: '#888',
};

// Horizontal-scroll row — clean overflow rather than line-wrap so
// each tile keeps its uniform width and the total ribbon height
// stays stable regardless of headline count.
const rowStyle = {
  display: 'flex',
  flexDirection: 'row',
  gap: 6,
  overflowX: 'auto',
  paddingBottom: 4,
};

const placeholderStyle = {
  fontSize: 11,
  color: '#999',
  fontStyle: 'italic',
  padding: '12px 4px',
};

const tileStyle = {
  flex: '0 0 auto',
  minWidth: 130,
  maxWidth: 180,
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 8,
  padding: '8px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
};

const tileLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 10,
  color: '#666',
  fontWeight: 500,
  lineHeight: 1.3,
  flexWrap: 'wrap',
};

const tileFeaturePrefixStyle = {
  color: '#888',
};

const tileFeatureDotStyle = {
  color: '#bbb',
};

const tileLabelTextStyle = {
  color: '#222',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flex: 1,
  minWidth: 0,
};

const tileInfoIconStyle = {
  fontSize: 10,
  color: '#94A3B8',
  cursor: 'help',
};

// `whiteSpace: pre-wrap` keeps yml-authored newlines visible — so
// the formula on its own line renders as the author intended. See
// `FeatureCardKpi.jsx` for the matching style on canvas cards.
const tooltipBodyStyle = {
  whiteSpace: 'pre-wrap',
  lineHeight: 1.4,
};

const tileValueStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums',
};

const tileUnitStyle = {
  fontSize: 10,
  color: '#666',
  lineHeight: 1.2,
};

export default KpiRibbon;

import { useCallback, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import GridLayout, { setTopLeft } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { CreateNewIcon } from 'assets/icons';
import {
  PLOT_GROUPS,
  PLOT_LABELS,
  VIEW_PLOT_RESULTS,
} from 'features/plots/constants';
import { useProjectStore } from 'features/project/stores/projectStore';
import {
  DEFAULT_CARD_W,
  DEFAULT_CARD_H,
  MAP_ANCHOR_W,
  MAP_ANCHOR_H,
} from '../stores/reportsStore';

import ReportMap from './ReportMap';
import FeatureCardPlot from './FeatureCardPlot';
import FeatureCardKpi from './FeatureCardKpi';
import './ReportColumn.css';

// Grid sizing. Fixed colWidth × ROW_HEIGHT × GRID_MARGIN gives the
// map its 500×280px launch size at MAP_DEFAULT_W=6, MAP_DEFAULT_H=5
// (= 6*70 + 5*16 wide, 5*40 + 4*20 tall). Total width is derived
// from the current layout so the canvas hugs the map at launch and
// grows as cards are dragged or added past its right edge.
const COL_WIDTH_PX = 70;
const ROW_HEIGHT_PX = 40;
const GRID_MARGIN = [16, 20];
const MIN_COLS = MAP_ANCHOR_W;
const MAP_DEFAULT_W = MAP_ANCHOR_W;
const MAP_DEFAULT_H = MAP_ANCHOR_H;
const CARD_MIN_W = 3;
const CARD_MIN_H = 3;

// Spare columns at the right edge so the rightmost card always has
// room to drag east. Sized for one card-min-width's worth of slack.
const DRAG_BUFFER_COLS = CARD_MIN_W;

// Mirrors react-grid-layout's internal formula with containerPadding
// = [0, 0]: colWidth = (width - marginX * (cols - 1)) / cols.
const widthForCols = (cols) =>
  cols * COL_WIDTH_PX + Math.max(0, cols - 1) * GRID_MARGIN[0];

// react-grid-layout v2 defaults to `transform: translate(...)` with a
// CSS transition on width/height. That transition fires deck.gl's
// WebGL ResizeObserver mid-animation, before its device is ready,
// causing a `maxTextureDimension2D` error and a half-broken map on
// first mount. `left/top` positioning skips the transform + transition
// so deck.gl sees the final tile size on its first measurement.
const absolutePositionStrategy = {
  type: 'absolute',
  scale: 1,
  calcStyle: setTopLeft,
};

// Build the antd Dropdown `menu.items` tree for "Add a feature card",
// derived from PLOT_GROUPS / PLOT_LABELS / VIEW_PLOT_RESULTS so it
// stays in lock-step with the main viewport's PlotChoices picker.
const topLabel = (group) => {
  const Icon = group.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {Icon && <Icon style={{ fontSize: 16 }} />}
      {group.label}
    </span>
  );
};

const nestedLabel = (text) => `- ${text}`;

function buildPlotMenuItems(onPick) {
  const plotLeaf = (key, familyFirstKey) => {
    const script = VIEW_PLOT_RESULTS[key];
    if (!script) return null;
    return {
      key: `${familyFirstKey}::${key}`,
      label: nestedLabel(PLOT_LABELS[key] || key),
      onClick: () => onPick(familyFirstKey, script),
    };
  };

  const subgroupLevel = (sub) => ({
    key: sub.label,
    label: nestedLabel(sub.label),
    children: sub.keys.map((k) => plotLeaf(k, sub.keys[0])).filter(Boolean),
  });

  return PLOT_GROUPS.map((group) => {
    if (group.subgroups) {
      return {
        key: group.label,
        label: topLabel(group),
        children: group.subgroups.map(subgroupLevel),
      };
    }
    return {
      key: group.label,
      label: topLabel(group),
      children: group.keys
        .map((k) => plotLeaf(k, group.keys[0]))
        .filter(Boolean),
    };
  });
}

/**
 * A single report column. Tiles (map + feature cards) are placed by
 * `react-grid-layout`, which handles drag, resize, collision, and
 * vertical auto-compaction. Map position is local (per-column);
 * feature-card positions are persisted via `onApplyLayouts`.
 *
 * Props:
 *   columnDef         — { type, scenario, whatif?, feature? }
 *   cards             — [{ id, row, col, w, h, feature, plots[] }]
 *   onEditPlot,       onDeletePlot, onDeleteCard
 *   onAddPlotToCard(cardId, script?)
 *   onAddCard({ targetCardId, direction, feature?, script? })
 *   onApplyLayouts(updates) — persist drag/resize, batched
 *   onPlotReady(plotId, div) — y-axis alignment hook
 *   onAddColumn / addColumnTooltip — title-card "+" affordance
 */
const ReportColumn = ({
  columnDef,
  cards = [],
  style,
  onEditPlot,
  onDeletePlot,
  onDeleteCard,
  onPlotReady,
  onAddPlotToCard,
  onAddCard,
  onApplyLayouts,
  onAddColumn,
  addColumnTooltip = 'Add column',
}) => {
  const project = useProjectStore((s) => s.project);

  const scenario = columnDef.scenario;
  const whatif = columnDef.whatif || null;

  const [mapPos, setMapPos] = useState({
    x: 0,
    y: 0,
    w: MAP_DEFAULT_W,
    h: MAP_DEFAULT_H,
  });

  const layout = useMemo(() => {
    const items = [
      {
        i: 'MAP',
        x: mapPos.x,
        y: mapPos.y,
        w: mapPos.w,
        h: mapPos.h,
        minW: CARD_MIN_W,
        minH: CARD_MIN_H,
      },
    ];
    for (const card of cards) {
      items.push({
        i: card.id,
        x: card.col ?? 0,
        y: card.row ?? 0,
        w: card.w ?? DEFAULT_CARD_W,
        h: card.h ?? DEFAULT_CARD_H,
        minW: CARD_MIN_W,
        minH: CARD_MIN_H,
      });
    }
    return items;
  }, [cards, mapPos]);

  // Grid width tracks the right-most tile + a `DRAG_BUFFER_COLS`
  // headroom so the rightmost card always has room to drag east.
  // Without the buffer, react-grid-layout's `cols === rightmost
  // edge` constraint pins any rightmost tile in place horizontally —
  // dragging east would push x+w past `cols`, which the library
  // refuses. MIN_COLS is the floor at launch (canvas hugs the map).
  const { effectiveCols, gridWidthPx } = useMemo(() => {
    let maxRight = MIN_COLS;
    for (const item of layout) {
      const right = item.x + item.w;
      if (right > maxRight) maxRight = right;
    }
    const cols = Math.max(MIN_COLS, maxRight + DRAG_BUFFER_COLS);
    return {
      effectiveCols: cols,
      gridWidthPx: widthForCols(cols),
    };
  }, [layout]);

  // react-grid-layout fires this on mount AND on every drag/resize.
  // The per-card diff in the store's `applyCardLayouts` skips writes
  // when nothing actually changed.
  const handleLayoutChange = useCallback(
    (nextLayout) => {
      const cardUpdates = [];
      for (const item of nextLayout) {
        if (item.i === 'MAP') {
          setMapPos((prev) => {
            if (
              prev.x === item.x &&
              prev.y === item.y &&
              prev.w === item.w &&
              prev.h === item.h
            )
              return prev;
            return { x: item.x, y: item.y, w: item.w, h: item.h };
          });
        } else {
          cardUpdates.push({
            id: item.i,
            row: item.y,
            col: item.x,
            w: item.w,
            h: item.h,
          });
        }
      }
      if (cardUpdates.length > 0) onApplyLayouts?.(cardUpdates);
    },
    [onApplyLayouts],
  );

  // Card auto-grow: FeatureCard reports its preferred pixel height
  // (sum of plot natural heights + chrome). Grow card.h to fit
  // whenever the report exceeds the previous report for the same
  // card — that way adding a 2nd/3rd plot keeps growing, while the
  // re-renders triggered by other layout changes don't undo a
  // user-driven shrink (same totalPx → no-op).
  const lastReported = useRef(new Map());
  const handlePreferredHeight = useCallback(
    (cardId, totalPx) => {
      const prev = lastReported.current.get(cardId) ?? 0;
      if (totalPx <= prev) return;
      lastReported.current.set(cardId, totalPx);
      // Invert rgl's tile-pixel formula: tilePx = h * ROW_HEIGHT +
      // (h - 1) * marginY → h = ceil((tilePx + marginY) / step).
      const required = Math.ceil(
        (totalPx + GRID_MARGIN[1]) / (ROW_HEIGHT_PX + GRID_MARGIN[1]),
      );
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.h >= required) return;
      onApplyLayouts?.([
        { id: cardId, row: card.row, col: card.col, w: card.w, h: required },
      ]);
    },
    [cards, onApplyLayouts],
  );

  // For each tile, decide whether its right and bottom edges sit on
  // the perimeter of the union of all tiles. A `+` button only renders
  // on an exposed edge — interior edges (where another tile is
  // immediately adjacent) stay clean.
  const exposureMap = useMemo(() => computeExposure(layout), [layout]);

  // Card-type picker for a `+` affordance. Top-level Map / Plot /
  // KPI selection — Map and KPI are placeholders (greyed out) until
  // their backend selection modules land. Plot expands to the
  // existing nested feature → leaf picker.
  const buildAddCardMenu = useCallback(
    (targetCardId, direction) =>
      onAddCard
        ? {
            items: [
              { key: 'map', label: 'Map', disabled: true },
              {
                key: 'plot',
                label: 'Plot',
                children: buildPlotMenuItems((feature, script) =>
                  onAddCard({
                    targetCardId,
                    direction,
                    type: 'plot',
                    feature,
                    script,
                  }),
                ),
              },
              { key: 'kpi', label: 'KPI', disabled: true },
            ],
          }
        : null,
    [onAddCard],
  );

  let headerText = scenario;
  if (columnDef.type === 'whatif' && columnDef.whatif) {
    headerText = `${scenario}: ${columnDef.whatif}`;
  }

  return (
    <div style={{ ...columnStyle, ...style }}>
      {/* Title card + optional "+ Add scenario" button. */}
      <div style={titleRowStyle}>
        <div style={titleCardStyle}>
          <div style={headerStyle}>{headerText}</div>
        </div>
        {onAddColumn && (
          <div className="cea-card-icon-button-container">
            <Tooltip title={addColumnTooltip} placement="bottom">
              <Button
                type="text"
                icon={<CreateNewIcon />}
                onClick={onAddColumn}
                aria-label={addColumnTooltip}
              />
            </Tooltip>
          </div>
        )}
      </div>

      <div style={{ ...gridWrapperStyle, width: gridWidthPx }}>
        <GridLayout
          className="cea-report-grid"
          layout={layout}
          width={gridWidthPx}
          // react-grid-layout v2 requires sizing knobs nested in
          // `gridConfig`. The v1 top-level names (cols, rowHeight,
          // margin, containerPadding) are silently ignored.
          gridConfig={{
            cols: effectiveCols,
            rowHeight: ROW_HEIGHT_PX,
            margin: GRID_MARGIN,
            containerPadding: [0, 0],
          }}
          dragConfig={{
            cancel:
              'input,textarea,select,option,button,.ant-dropdown-menu,.ant-select,.cea-no-drag',
          }}
          positionStrategy={absolutePositionStrategy}
          onLayoutChange={handleLayoutChange}
        >
          {/* ── Map tile ─────────────────────────────────────── */}
          <div key="MAP" style={tileStyle} className="cea-report-tile">
            <div style={mapFillStyle}>
              <ReportMap project={project} scenario={scenario} />
            </div>
            <PerimeterPlusButtons
              targetCardId="MAP"
              exposure={exposureMap['MAP']}
              buildMenu={buildAddCardMenu}
            />
          </div>

          {/* ── Feature cards ────────────────────────────────── */}
          {cards.map((card) => (
            <div key={card.id} style={tileStyle} className="cea-report-tile">
              {card.type === 'kpi' ? (
                <FeatureCardKpi
                  card={card}
                  project={project}
                  scenario={scenario}
                  whatif={whatif}
                  onDeleteCard={
                    onDeleteCard ? () => onDeleteCard(card.id) : undefined
                  }
                />
              ) : (
                <FeatureCardPlot
                  card={card}
                  scenario={scenario}
                  onEditPlot={(plotId) => onEditPlot?.(card.id, plotId)}
                  onDeletePlot={
                    onDeletePlot
                      ? (plotId) => onDeletePlot(card.id, plotId)
                      : undefined
                  }
                  onAddPlot={
                    onAddPlotToCard
                      ? (script) => onAddPlotToCard(card.id, script)
                      : undefined
                  }
                  onDeleteCard={
                    onDeleteCard ? () => onDeleteCard(card.id) : undefined
                  }
                  onPlotReady={onPlotReady}
                  onPreferredHeight={handlePreferredHeight}
                />
              )}
              <PerimeterPlusButtons
                targetCardId={card.id}
                exposure={exposureMap[card.id]}
                buildMenu={buildAddCardMenu}
              />
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  );
};

const columnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  alignItems: 'stretch',
};

// Sticky so the scenario / what-if header stays visible when the
// canvas grows taller than the viewport. `top: 0` pins it to the
// top of the canvas cell's scroll container; the white background
// hides grid content scrolling underneath. zIndex sits above the
// perimeter `+` buttons (z 3) and rgl items (z 1-2).
//
// `paddingTop` keeps the title card off the canvas card's top edge
// when stuck — without it, the title card would sit flush with the
// rounded canvas corner since the scroll container and canvasStyle
// share `y = 0`. The title row's own white background fills the
// padding region.
const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  position: 'sticky',
  top: 0,
  zIndex: 4,
  background: '#fff',
  paddingTop: 16,
  paddingBottom: 8,
};

const titleCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '10px 16px',
  boxSizing: 'border-box',
  minWidth: 200,
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
  width: 'fit-content',
};

const headerStyle = {
  fontSize: 22,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.2,
};

const gridWrapperStyle = {
  width: '100%',
};

const tileStyle = {
  width: '100%',
  height: '100%',
  position: 'relative',
};

const mapFillStyle = {
  width: '100%',
  height: '100%',
};

// `+` affordances hanging off a tile's right / bottom edges, centred
// on each edge and nudged 8 px beyond it. `.cea-no-drag` prevents
// the click from starting a drag.
const plusRightStyle = {
  position: 'absolute',
  top: '50%',
  left: '100%',
  transform: 'translateY(-50%)',
  marginLeft: 8,
  zIndex: 3,
};

const plusBottomStyle = {
  position: 'absolute',
  top: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginTop: 8,
  zIndex: 3,
};

// Right-edge + bottom-edge `+` affordances. Each `exposure.{right,
// bottom}` is either `null` (edge fully blocked or only too-small
// slivers exposed) or `{ fraction }` — the centre of the largest
// exposed segment as a 0..1 fraction along the edge. The button's
// CSS positioning is overridden to that fraction so it lands on the
// exposed strip even when neighbouring tiles cover part of the edge.
const PerimeterPlusButtons = ({ targetCardId, exposure, buildMenu }) => {
  const rightAnchor = exposure?.right;
  const bottomAnchor = exposure?.bottom;
  const rightMenu = rightAnchor ? buildMenu(targetCardId, 'right') : null;
  const bottomMenu = bottomAnchor ? buildMenu(targetCardId, 'bottom') : null;
  const rightStyle = rightAnchor
    ? { ...plusRightStyle, top: `${rightAnchor.fraction * 100}%` }
    : null;
  const bottomStyle = bottomAnchor
    ? { ...plusBottomStyle, left: `${bottomAnchor.fraction * 100}%` }
    : null;
  return (
    <>
      {rightMenu && (
        <Dropdown menu={rightMenu} trigger={['click']} placement="bottomLeft">
          <div
            className="cea-card-icon-button-container cea-no-drag"
            style={rightStyle}
          >
            <Tooltip title="Add a Feature card" placement="bottom">
              <Button
                type="text"
                icon={<CreateNewIcon />}
                aria-label="Add a Feature card"
              />
            </Tooltip>
          </div>
        </Dropdown>
      )}
      {bottomMenu && (
        <Dropdown menu={bottomMenu} trigger={['click']} placement="bottomLeft">
          <div
            className="cea-card-icon-button-container cea-no-drag"
            style={bottomStyle}
          >
            <Tooltip title="Add a Feature card" placement="bottom">
              <Button
                type="text"
                icon={<CreateNewIcon />}
                aria-label="Add a Feature card"
              />
            </Tooltip>
          </div>
        </Dropdown>
      )}
    </>
  );
};

// Compute right/bottom exposure for every tile in `layout`. Each
// entry is either `null` (no exposed segment large enough to fit
// the `+` button — fully interior, or only cramped slivers) or
// `{ fraction }` — the centre of the largest exposed segment as a
// 0..1 fraction along the edge. The button is positioned at that
// fraction so it always lands on the exposed strip.
function computeExposure(layout) {
  const out = {};
  for (const item of layout) {
    out[item.i] = {
      right: pickExposedAnchor(item, layout, 'right'),
      bottom: pickExposedAnchor(item, layout, 'bottom'),
    };
  }
  return out;
}

function pickExposedAnchor(item, layout, side) {
  const segments = findExposedSegments(item, layout, side);
  if (segments.length === 0) return null;

  // Convert segment lengths to pixels and pick the longest. The
  // grid step (row + Y margin / col + X margin) is the per-unit
  // pixel approximation — exact within a single tile if there's
  // no inter-tile gap straddling the segment, slightly generous
  // otherwise. Fine for the threshold check.
  const isRight = side === 'right';
  const unitToPx = isRight
    ? ROW_HEIGHT_PX + GRID_MARGIN[1]
    : COL_WIDTH_PX + GRID_MARGIN[0];

  let best = null;
  let bestLenPx = 0;
  for (const [s, e] of segments) {
    const lenPx = (e - s) * unitToPx;
    if (lenPx > bestLenPx) {
      bestLenPx = lenPx;
      best = [s, e];
    }
  }
  if (bestLenPx < PLUS_BUTTON_MIN_EDGE_PX) return null;

  const itemStart = isRight ? item.y : item.x;
  const itemSpan = isRight ? item.h : item.w;
  return { fraction: ((best[0] + best[1]) / 2 - itemStart) / itemSpan };
}

function findExposedSegments(item, layout, side) {
  const isRight = side === 'right';
  const edge = isRight ? item.x + item.w : item.y + item.h;
  const latStart = isRight ? item.y : item.x;
  const latEnd = latStart + (isRight ? item.h : item.w);

  // Collect the lateral intervals where other tiles touch this edge.
  const blockers = [];
  for (const other of layout) {
    if (other === item) continue;
    const oPerpStart = isRight ? other.x : other.y;
    const oPerpEnd = oPerpStart + (isRight ? other.w : other.h);
    if (oPerpStart > edge || oPerpEnd <= edge) continue;
    const oLatStart = isRight ? other.y : other.x;
    const oLatEnd = oLatStart + (isRight ? other.h : other.w);
    const lo = Math.max(oLatStart, latStart);
    const hi = Math.min(oLatEnd, latEnd);
    if (hi > lo) blockers.push([lo, hi]);
  }
  blockers.sort((a, b) => a[0] - b[0]);

  // Walk blockers; the gaps between them are the exposed segments.
  const exposed = [];
  let cursor = latStart;
  for (const [s, e] of blockers) {
    if (s > cursor) exposed.push([cursor, s]);
    if (e > cursor) cursor = e;
  }
  if (cursor < latEnd) exposed.push([cursor, latEnd]);
  return exposed;
}

// `cea-card-icon-button-container` renders at ≈ 38 px (30 px icon +
// 3 px padding + 1 px border each side). Require the longest exposed
// segment to be at least 2.5 × that so the button has clear breathing
// room past adjacent tiles.
const PLUS_BUTTON_HEIGHT_PX = 38;
const PLUS_BUTTON_MIN_EDGE_PX = PLUS_BUTTON_HEIGHT_PX * 2.5;

export default ReportColumn;

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
import FeatureCard from './FeatureCard';
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
 *   onEditPlot,       onResetPlot, onDeletePlot, onDeleteCard
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
  onResetPlot,
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

  // Build a plot-picker dropdown menu for a `+` affordance. Mirrors
  // the picker shown by the main viewport's PlotChoices.
  const buildAddCardMenu = useCallback(
    (targetCardId, direction) =>
      onAddCard
        ? {
            items: buildPlotMenuItems((feature, script) =>
              onAddCard({ targetCardId, direction, feature, script }),
            ),
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
              <FeatureCard
                card={card}
                project={project}
                scenario={scenario}
                whatif={whatif}
                onEditPlot={(plotId) => onEditPlot?.(card.id, plotId)}
                onResetPlot={(plotId) => onResetPlot?.(card.id, plotId)}
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

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
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

// Right-edge + bottom-edge `+` affordances, rendered only on edges
// flagged as exposed by `computeExposure`. Each opens a plot-picker
// dropdown; selection inserts a new feature card adjacent to this
// tile (right or bottom).
const PerimeterPlusButtons = ({ targetCardId, exposure, buildMenu }) => {
  const rightMenu = exposure?.right ? buildMenu(targetCardId, 'right') : null;
  const bottomMenu = exposure?.bottom
    ? buildMenu(targetCardId, 'bottom')
    : null;
  return (
    <>
      {rightMenu && (
        <Dropdown menu={rightMenu} trigger={['click']} placement="bottomLeft">
          <div
            className="cea-card-icon-button-container cea-no-drag"
            style={plusRightStyle}
          >
            <Tooltip title="Add a Feature card" placement="bottom">
              <Button
                type="text"
                icon={<CreateNewIcon />}
                aria-label="Add a Feature card to the right"
              />
            </Tooltip>
          </div>
        </Dropdown>
      )}
      {bottomMenu && (
        <Dropdown menu={bottomMenu} trigger={['click']} placement="bottomLeft">
          <div
            className="cea-card-icon-button-container cea-no-drag"
            style={plusBottomStyle}
          >
            <Tooltip title="Add a Feature card below" placement="bottom">
              <Button
                type="text"
                icon={<CreateNewIcon />}
                aria-label="Add a Feature card below"
              />
            </Tooltip>
          </div>
        </Dropdown>
      )}
    </>
  );
};

// Compute right/bottom exposure for every tile in `layout`. A tile's
// right edge is "exposed" iff *any* portion of it sits on the
// perimeter of the union of all tiles — i.e. there's at least one
// gap along the edge where no other tile occupies the column at
// `x + w`. Same logic transposed for the bottom edge. Lenient on
// purpose so a partially-blocked edge still gets a `+` button.
function computeExposure(layout) {
  const out = {};
  for (const item of layout) {
    out[item.i] = {
      right: hasGapAlongEdge(item, layout, 'right'),
      bottom: hasGapAlongEdge(item, layout, 'bottom'),
    };
  }
  return out;
}

function hasGapAlongEdge(item, layout, side) {
  const isRight = side === 'right';
  // The edge sits at this perpendicular coord (column for right edge,
  // row for bottom edge). Lateral = along the edge.
  const edge = isRight ? item.x + item.w : item.y + item.h;
  const latStart = isRight ? item.y : item.x;
  const latEnd = latStart + (isRight ? item.h : item.w);

  // Collect the lateral intervals where other tiles touch this edge.
  const intervals = [];
  for (const other of layout) {
    if (other === item) continue;
    const oPerpStart = isRight ? other.x : other.y;
    const oPerpEnd = oPerpStart + (isRight ? other.w : other.h);
    if (oPerpStart > edge || oPerpEnd <= edge) continue;
    const oLatStart = isRight ? other.y : other.x;
    const oLatEnd = oLatStart + (isRight ? other.h : other.w);
    const lo = Math.max(oLatStart, latStart);
    const hi = Math.min(oLatEnd, latEnd);
    if (hi > lo) intervals.push([lo, hi]);
  }
  if (intervals.length === 0) return true;

  // Sort by start, walk left→right; any gap means the edge is
  // partially on the perimeter.
  intervals.sort((a, b) => a[0] - b[0]);
  let cursor = latStart;
  for (const [s, e] of intervals) {
    if (s > cursor) return true;
    if (e > cursor) cursor = e;
  }
  return cursor < latEnd;
}

export default ReportColumn;

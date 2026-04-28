import { useCallback, useMemo, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import GridLayout, { setTopLeft } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { CreateNewIcon } from 'assets/icons';
import {
  iconMap,
  PLOT_GROUPS,
  PLOT_LABELS,
  VIEW_PLOT_RESULTS,
} from 'features/plots/constants';
import { COLOR_MODES, useMapStore } from 'features/map/stores/mapStore';
import ConstructionStandardLegend from 'features/map/components/Map/Layers/ConstructionStandardLegend';
import { useMapLayerCategories } from 'features/project/components/Cards/MapLayersCard/store';
import { useProjectStore } from 'features/project/stores/projectStore';

import {
  DEFAULT_CARD_W,
  DEFAULT_CARD_H,
  MAP_ANCHOR_W,
  MAP_ANCHOR_H,
  useCanvasStore,
} from '../stores/canvasStore';
import CanvasMap from './CanvasMap';
import FeatureCardPlot from './FeatureCardPlot';
import FeatureCardKpi from './FeatureCardKpi';
import FeatureCardMap from './FeatureCardMap';
import { PerimeterPlusButtons, computeExposure } from './PerimeterPlusButtons';
import './CanvasColumn.css';

// Grid sizing. Fixed colWidth × ROW_HEIGHT × GRID_MARGIN gives the
// map tile its 500×280px launch size at MAP_ANCHOR_W=6 / MAP_ANCHOR_H=5
// (= 6*70 + 5*16 wide, 5*40 + 4*20 tall). Total grid width is derived
// from the current layout so the canvas hugs the map at launch and
// grows as cards are dragged or added past its right edge.
const COL_WIDTH_PX = 70;
const ROW_HEIGHT_PX = 40;
const GRID_MARGIN = [16, 20];
const MIN_COLS = MAP_ANCHOR_W;
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

// Render helper: label cell with a leading icon. Shared by Plot
// family headers and Map category headers in the `+` picker.
const labelWithIcon = (Icon, text) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    {Icon && <Icon style={{ fontSize: 16 }} />}
    {text}
  </span>
);

const nestedLabel = (text) => `- ${text}`;

// Build the antd `menu.items` tree for the Plot section of the `+`
// picker, derived from PLOT_GROUPS / PLOT_LABELS / VIEW_PLOT_RESULTS
// so it stays in lock-step with the main viewport's PlotChoices.
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
        label: labelWithIcon(group.icon, group.label),
        children: group.subgroups.map(subgroupLevel),
      };
    }
    return {
      key: group.label,
      label: labelWithIcon(group.icon, group.label),
      children: group.keys
        .map((k) => plotLeaf(k, group.keys[0]))
        .filter(Boolean),
    };
  });
}

/**
 * A single report column. Tiles (primary map + feature cards) are
 * placed by `react-grid-layout`, which handles drag, resize, collision,
 * and vertical auto-compaction. Primary-map position is local
 * (per-column); feature-card positions are persisted via
 * `onApplyLayouts`.
 *
 * Each feature card is dispatched by `card.type`:
 *   'plot' → `<FeatureCardPlot>`
 *   'kpi'  → `<FeatureCardKpi>`
 *   'map'  → `<FeatureCardMap>` (mirrors the primary map widget)
 *
 * Props:
 *   columnDef         — { type, scenario, whatif?, feature? }
 *   cards             — [{ id, type, row, col, w, h, feature?,
 *                         category?, layer?, plots? }]
 *   onEditPlot, onDeletePlot, onDeleteCard
 *   onAddPlotToCard(cardId, script?)
 *   onAddCard({ targetCardId, direction, type, feature?, script?,
 *               category?, layer? })
 *   onApplyLayouts(updates)   — persist drag/resize, batched
 *   onOpenMapBottom()         — open the page-level
 *                               MapLayerProperties bottom card
 *   onPlotReady(plotId, div)  — y-axis alignment hook
 *   onAddColumn / addColumnTooltip — title-card "+" affordance
 *   isOrigin                  — leftmost column in compare mode;
 *                               renders "Origin" badge.
 *   lockedReadOnly            — non-origin column in compare mode;
 *                               drops every editing affordance
 *                               (perimeter `+`, card Edit/Delete,
 *                               map-card open). Display content
 *                               (plots, KPIs, maps, legends) still
 *                               renders normally.
 *   onCloseColumn             — non-origin only; renders an `×`
 *                               in the title row that drops this
 *                               scenario / what-if from the
 *                               comparison.
 *   compactLayout             — comparison-mode flag. Cards
 *                               display in a single vertical stack
 *                               at the map's width; horizontal
 *                               drag/resize is suppressed and the
 *                               right-edge `+` is hidden. Drag
 *                               still works for vertical reordering;
 *                               vertical resize still works.
 */
const CanvasColumn = ({
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
  onOpenMapBottom,
  editingPlotCardId,
  activeMapCardId,
  onAddColumn,
  addColumnTooltip = 'Add column',
  addColumnDisabled = false,
  isOrigin = false,
  lockedReadOnly = false,
  onCloseColumn,
  compactLayout = false,
}) => {
  const project = useProjectStore((s) => s.project);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const layoutLocked = useCanvasStore((s) => s.fixLayout);

  const scenario = columnDef.scenario;
  const whatif = columnDef.whatif || null;

  // Non-origin columns in compare mode are pure mirrors — drop the
  // editing callbacks at the top so the existing "callback ?
  // wrapper : undefined" patterns below remove the corresponding
  // chrome on FeatureCardShell. Map cards' onOpenMapBottom is
  // also dropped so the bottom-card edit flow can't be triggered
  // from a non-origin map. The display content (Plot HTML, KPI
  // strips, MapLibre tiles) renders normally — only the editing
  // surface is gated.
  if (lockedReadOnly) {
    onEditPlot = undefined;
    onDeletePlot = undefined;
    onDeleteCard = undefined;
    onAddPlotToCard = undefined;
    onAddCard = undefined;
    onOpenMapBottom = undefined;
  }
  const showPerimeterPlus = enableEdit && !lockedReadOnly;

  const [mapPos, setMapPos] = useState({
    x: 0,
    y: 0,
    w: MAP_ANCHOR_W,
    h: MAP_ANCHOR_H,
  });

  // Map tile auto-grows downward to host the use-type / construction
  // legend rendered under the map. The legend's pixel height is
  // estimated from its entry count (one swatch per entry) and
  // converted to grid rows so the tile owns the legend's space —
  // bottom `+` button stays at the tile's true bottom edge, cards
  // below shift to make room. `mapPos.h` keeps the user-set height
  // (no legend); `legendExtraRows` is the auto-added bump.
  const colorMode = useMapStore((s) => s.colorMode);
  const constructionColorMap = useMapStore((s) => s.constructionColorMap);
  const useTypeColorMap = useMapStore((s) => s.useTypeColorMap);
  const legendExtraRows = useMemo(() => {
    let entries = 0;
    if (colorMode === COLOR_MODES.CONSTRUCTION_STANDARD)
      entries = Object.keys(constructionColorMap).length;
    else if (colorMode === COLOR_MODES.USE_TYPE)
      entries = Object.keys(useTypeColorMap).length;
    if (entries === 0) return 0;
    // Header (~38 px) + per-entry row (~24 px) + a little padding.
    const px = 38 + entries * 24 + 16;
    return Math.ceil(px / (ROW_HEIGHT_PX + GRID_MARGIN[1]));
  }, [colorMode, constructionColorMap, useTypeColorMap]);

  const layout = useMemo(() => {
    const items = [
      {
        i: 'MAP',
        x: mapPos.x,
        y: mapPos.y,
        w: mapPos.w,
        h: mapPos.h + legendExtraRows,
        minW: CARD_MIN_W,
        minH: CARD_MIN_H + legendExtraRows,
        // Frozen layout when Fix Layout (or Export View) is on — no
        // drag, no resize handles.
        isDraggable: !layoutLocked,
        isResizable: !layoutLocked,
      },
    ];
    for (const card of cards) {
      // Compact layout pins every card to the column-left at the
      // map's current width — single vertical stack matching the
      // primary map's footprint. Stored card.col / card.w are
      // ignored at render time and protected from clobbering on
      // drag (see `handleLayoutChange` below) so the original
      // free-form layout survives a round-trip back to launch.
      const cardX = compactLayout ? 0 : card.col ?? 0;
      const cardW = compactLayout ? mapPos.w : card.w ?? DEFAULT_CARD_W;
      items.push({
        i: card.id,
        x: cardX,
        y: card.row ?? 0,
        w: cardW,
        h: card.h ?? DEFAULT_CARD_H,
        minW: CARD_MIN_W,
        minH: CARD_MIN_H,
        // Compact mode locks horizontal drag/resize via `static`
        // on the x/w axes — react-grid-layout v2 doesn't expose
        // axis-specific locks, so we keep drag/resize on and
        // simply ignore col/w in the change handler. The visual
        // is the layout we just emitted.
        isDraggable: !layoutLocked,
        isResizable: !layoutLocked,
      });
    }
    return items;
  }, [cards, mapPos, legendExtraRows, layoutLocked, compactLayout]);

  // Grid width tracks the right-most tile + a `DRAG_BUFFER_COLS`
  // headroom so the rightmost card always has room to drag east.
  // Without the buffer, react-grid-layout's `cols === rightmost
  // edge` constraint pins any rightmost tile in place horizontally.
  // The buffer is skipped when (a) only the map is on the grid (the
  // map is anchored at (0,0) and rarely dragged east, so the
  // ~258 px launch whitespace isn't worth it), (b) the layout is
  // locked (Fix Layout / Export View) — drag is disabled, so the
  // headroom serves no purpose and just trails empty space, or
  // (c) compact-layout (compare mode) is on — every card is pinned
  // to x=0/w=mapPos.w and horizontal drag is ignored, so the
  // buffer would just bloat each column with empty space.
  const { effectiveCols, gridWidthPx } = useMemo(() => {
    let maxRight = MIN_COLS;
    for (const item of layout) {
      const right = item.x + item.w;
      if (right > maxRight) maxRight = right;
    }
    const skipBuffer = cards.length === 0 || layoutLocked || compactLayout;
    const buffer = skipBuffer ? 0 : DRAG_BUFFER_COLS;
    const cols = Math.max(MIN_COLS, maxRight + buffer);
    return {
      effectiveCols: cols,
      gridWidthPx: widthForCols(cols),
    };
  }, [layout, cards.length, layoutLocked, compactLayout]);

  // react-grid-layout fires this on mount AND on every drag/resize.
  // The per-card diff in the store's `applyCardLayouts` skips writes
  // when nothing actually changed.
  const handleLayoutChange = useCallback(
    (nextLayout) => {
      const cardUpdates = [];
      for (const item of nextLayout) {
        if (item.i === 'MAP') {
          // The fed-in layout has `legendExtraRows` baked in, so
          // strip it out before storing — `mapPos.h` is the user's
          // intended map height (no legend).
          const userH = Math.max(CARD_MIN_H, item.h - legendExtraRows);
          setMapPos((prev) => {
            if (
              prev.x === item.x &&
              prev.y === item.y &&
              prev.w === item.w &&
              prev.h === userH
            )
              return prev;
            return { x: item.x, y: item.y, w: item.w, h: userH };
          });
        } else {
          // Compact mode: only persist row/h — col/w are display-
          // only (forced to 0 / mapPos.w in the layout memo) and
          // shouldn't overwrite the user's original free-form
          // values stored on the card.
          if (compactLayout) {
            cardUpdates.push({ id: item.i, row: item.y, h: item.h });
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
      }
      if (cardUpdates.length > 0) onApplyLayouts?.(cardUpdates);
    },
    [onApplyLayouts, legendExtraRows, compactLayout],
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
  // the perimeter of the union of all tiles. A `+` button only
  // renders on an exposed edge — interior edges (where another tile
  // is immediately adjacent) stay clean. Pitch values let the
  // helper convert grid units to pixels for the size threshold.
  const exposureMap = useMemo(
    () =>
      computeExposure(layout, {
        rowPitchPx: ROW_HEIGHT_PX + GRID_MARGIN[1],
        colPitchPx: COL_WIDTH_PX + GRID_MARGIN[0],
      }),
    [layout],
  );

  // Map menu mirrors the backend's map-layer category tree (same
  // tree the main viewport's MapLayerCategories uses) — never
  // hardcoded, just live data shaped into nested antd menu items.
  const mapData = useMapLayerCategories();

  // Build the per-section menus that the `+` expanded panel hangs
  // off. Returns separate `{ mapItems, plotItems }` so each icon in
  // the panel can be its own sub-Dropdown trigger. Map menu mirrors
  // the live `useMapLayerCategories` tree (category → layer); Plot
  // menu mirrors `PLOT_GROUPS` (family → optional subgroup → leaf).
  //
  // A map category's per-layer submenu only appears when it actually
  // hosts multiple layers (today: only LCA). Single-layer categories
  // collapse to one click that adds the card directly.
  const buildSectionMenus = useCallback(
    (targetCardId, direction) => {
      if (!onAddCard) return { mapItems: [], plotItems: [] };
      const onPickMap = (category, layer) =>
        onAddCard({ targetCardId, direction, type: 'map', category, layer });
      const mapItems =
        mapData?.categories?.flatMap((cat) => {
          const label = labelWithIcon(iconMap[cat.name], cat.label || cat.name);
          const layers = (cat.layers ?? []).filter(
            (l) => !HIDDEN_MAP_LAYERS.has(l.name),
          );
          if (layers.length === 0) return [];
          if (layers.length > 1) {
            return [
              {
                key: `map-${cat.name}`,
                label,
                children: layers.map((layer) => ({
                  key: `map-${cat.name}-${layer.name}`,
                  label: layer.label || layer.name,
                  onClick: () => onPickMap(cat.name, layer.name),
                })),
              },
            ];
          }
          const only = layers[0];
          return [
            {
              key: `map-${cat.name}`,
              label,
              onClick: () => onPickMap(cat.name, only.name),
            },
          ];
        }) ?? [];
      const plotItems = buildPlotMenuItems((feature, script) =>
        onAddCard({
          targetCardId,
          direction,
          type: 'plot',
          feature,
          script,
        }),
      );
      return { mapItems, plotItems };
    },
    [onAddCard, mapData],
  );

  let headerText = scenario;
  if (columnDef.type === 'whatif' && columnDef.whatif) {
    headerText = `${scenario}: ${columnDef.whatif}`;
  }

  return (
    <div style={{ ...columnStyle, ...style }}>
      {/* Title card + optional badges / close. The Origin badge
          on the leftmost compare column makes the
          "edit-once-mirror-everywhere" affordance discoverable
          (only the origin shows Edit / Delete / `+`). The `×`
          close on non-origin columns drops that scenario /
          what-if from the comparison via `removeColumn(i)`. */}
      <div style={titleRowStyle}>
        <div style={titleCardStyle}>
          {isOrigin && <span style={originBadgeStyle}>Origin</span>}
          <div style={headerStyle}>{headerText}</div>
        </div>
        {onCloseColumn && (
          <Tooltip title="Remove from comparison" placement="bottom">
            <div className="cea-card-icon-button-container">
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={onCloseColumn}
                aria-label="Remove column"
              />
            </div>
          </Tooltip>
        )}
        {onAddColumn && enableEdit && (
          <div className="cea-card-icon-button-container">
            <Tooltip
              title={
                addColumnDisabled
                  ? `${addColumnTooltip} (coming soon)`
                  : addColumnTooltip
              }
              placement="bottom"
            >
              <Button
                type="text"
                icon={<CreateNewIcon />}
                onClick={onAddColumn}
                disabled={addColumnDisabled}
                aria-label={addColumnTooltip}
              />
            </Tooltip>
          </div>
        )}
      </div>

      <div style={{ ...gridWrapperStyle, width: gridWidthPx }}>
        <GridLayout
          className="cea-canvas-grid"
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
            // Drag only initiates from elements matching `handle` —
            // the FeatureCardShell title row gets `cea-card-drag-handle`,
            // the primary map tile has its own drag strip below.
            // Without this restriction, a mousedown anywhere on the
            // card (including over the deck.gl canvas) would start a
            // grid drag and swallow the map's own pan/zoom handling.
            handle: '.cea-card-drag-handle',
            cancel:
              'input,textarea,select,option,button,.ant-dropdown-menu,.ant-select,.cea-no-drag',
          }}
          positionStrategy={absolutePositionStrategy}
          onLayoutChange={handleLayoutChange}
        >
          {/* ── Map tile ─────────────────────────────────────── */}
          <div key="MAP" style={mapTileStyle} className="cea-canvas-tile">
            {/* Top grip is the primary tile's drag handle — hidden
                whenever the layout is locked since dragging is
                disabled anyway. */}
            {!layoutLocked && (
              <div
                className="cea-card-drag-handle"
                style={primaryMapDragHandleStyle}
                aria-label="Drag overview map"
              >
                <span style={primaryMapDragGripStyle} />
              </div>
            )}
            <div style={mapFillStyle}>
              <CanvasMap
                project={project}
                scenario={scenario}
                showToolbar={enableEdit}
              />
            </div>
            <ConstructionStandardLegend style={overviewLegendStyle} />
            {showPerimeterPlus && (
              <PerimeterPlusButtons
                targetCardId="MAP"
                exposure={exposureMap['MAP']}
                buildSectionMenus={buildSectionMenus}
                breathing={cards.length === 0}
                hideRight={compactLayout}
              />
            )}
          </div>

          {/* ── Feature cards ────────────────────────────────── */}
          {cards.map((card) => (
            <div key={card.id} style={tileStyle} className="cea-canvas-tile">
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
              ) : card.type === 'map' ? (
                <FeatureCardMap
                  card={card}
                  project={project}
                  scenario={scenario}
                  onOpenBottom={onOpenMapBottom}
                  editing={activeMapCardId === card.id}
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
                  editing={editingPlotCardId === card.id}
                  onDeleteCard={
                    onDeleteCard ? () => onDeleteCard(card.id) : undefined
                  }
                  onPlotReady={onPlotReady}
                  onPreferredHeight={handlePreferredHeight}
                />
              )}
              {showPerimeterPlus && (
                <PerimeterPlusButtons
                  targetCardId={card.id}
                  exposure={exposureMap[card.id]}
                  buildSectionMenus={buildSectionMenus}
                  hideRight={compactLayout}
                />
              )}
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
  gap: 10,
  width: 'fit-content',
};

const headerStyle = {
  fontSize: 22,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.2,
};

// Origin-column accent — sits inside the title card before the
// scenario name. Brand-blue background mirrors the Compare
// button's active state so the connection ("this is where the
// edits happen") is visible at a glance.
const originBadgeStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#fff',
  background: '#1471B0',
  padding: '2px 8px',
  borderRadius: 4,
  letterSpacing: 0.3,
};

const gridWrapperStyle = {
  width: '100%',
};

const tileStyle = {
  width: '100%',
  height: '100%',
  position: 'relative',
};

// Map tile is a flex column so the legend can sit underneath the map
// inside the same tile. The tile's `h` is auto-grown by
// `legendExtraRows` so the map keeps its user-set size and the legend
// occupies the bump — bottom `+` button stays at the tile's true
// bottom edge (now below the legend) and below-MAP cards shift down.
const mapTileStyle = {
  ...tileStyle,
  display: 'flex',
  flexDirection: 'column',
};

const mapFillStyle = {
  flex: 1,
  minHeight: 0,
  width: '100%',
};

// Strip the floating-card chrome so the legend reads as part of the
// tile rather than a popover. Horizontal padding (16px) matches
// `FeatureCardShell.cardStyle` so the legend's swatches + labels
// align with content in neighbouring FeatureCards. Bottom padding
// keeps the last entry off the tile edge.
const overviewLegendStyle = {
  width: '100%',
  marginTop: 8,
  boxShadow: 'none',
  backgroundColor: 'transparent',
  padding: '0 16px 12px',
  maxHeight: 'none',
};

// The primary map has no title row, so a thin top strip stands in as
// the drag handle. Centred grip pill mirrors the pathway-panel
// resize affordance so the affordance reads consistently across the
// app. Sized small (~14px) to keep the map's vertical real estate.
const primaryMapDragHandleStyle = {
  height: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
  flexShrink: 0,
};

const primaryMapDragGripStyle = {
  width: 36,
  height: 4,
  borderRadius: 999,
  background: 'rgba(148, 163, 184, 0.7)',
};

// TODO: drop once these layers exist as real map overlays in the
// backend `/api/map_layers/` response. They show up in the response
// but have no overlay data, so picking them yields a card with an
// empty map. Hidden from the Map picker for now.
const HIDDEN_MAP_LAYERS = new Set([
  'emission-timeline',
  'pathway-emission-timeline',
]);

export default CanvasColumn;

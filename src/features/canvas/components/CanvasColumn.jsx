import { useCallback, useEffect, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import { Button, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import { CEA_PURPLE } from 'constants/theme';
import GridLayout, { setTopLeft } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import {
  CreateNewIcon,
  LockOffIcon,
  LockOnIcon,
  RefreshIcon,
} from 'assets/icons';
import {
  iconMap,
  PLOT_GROUPS,
  PLOT_LABELS,
  VIEW_PLOT_RESULTS,
} from 'features/plots/constants';
import { COLOR_MODES, useMapStore } from 'features/map/stores/mapStore';
import ConstructionStandardLegend from 'features/map/components/Map/Layers/ConstructionStandardLegend';
import {
  generateConstructionColorMap,
  generateUseTypeColorMap,
} from 'features/map/utils/constructionColors';
import { useMapLayerCategories } from 'features/project/components/Cards/MapLayersCard/store';
import { useProjectStore } from 'features/project/stores/projectStore';

import {
  DEFAULT_CARD_W,
  DEFAULT_CARD_H,
  MAP_ANCHOR_W,
  useCanvasStore,
} from '../stores/canvasStore';
import CanvasMap from './CanvasMap';
import FeatureCardPlot from './FeatureCardPlot';
import FeatureCardKpi from './FeatureCardKpi';
import FeatureCardMap from './FeatureCardMap';
import FeatureCardText from './FeatureCardText';
import FeatureCardDivider from './FeatureCardDivider';
import { MapColumnContext } from './mapInstance';
import { PerimeterPlusButtons, computeExposure } from './PerimeterPlusButtons';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
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
  isOrigin = false,
  lockedReadOnly = false,
  onCloseColumn,
  compactLayout = false,
  // Forwarded to FeatureCardMap so per-card stores key on
  // `(columnIndex, cardId)` — see mapInstance.js.
  columnIndex = null,
}) => {
  const project = useProjectStore((s) => s.project);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const layoutLocked = useCanvasStore((s) => s.fixLayout);
  const alignmentRevision = useCanvasStore((s) => s.alignmentRevision);
  const bumpAlignmentRevision = useCanvasStore((s) => s.bumpAlignmentRevision);
  const mirrorsLocked = useCanvasStore((s) => s.mirrorsLocked);
  const setMirrorsLocked = useCanvasStore((s) => s.setMirrorsLocked);
  const resyncMirrorsToOrigin = useCanvasStore((s) => s.resyncMirrorsToOrigin);
  const singletonMapPos = useCanvasStore((s) => s.mapPos);
  const setSingletonMapPos = useCanvasStore((s) => s.setMapPos);
  const columnMapPosOverride = useCanvasStore(
    (s) => s.columnMapPos[String(columnIndex)],
  );
  const setColumnMapPos = useCanvasStore((s) => s.setColumnMapPos);
  // When mirrors are unlocked, this column owns its title-map size
  // via `columnMapPos[columnIndex]`; reads fall through to the
  // singleton until the user resizes (the override slot starts
  // empty). When locked, every column reads the singleton so
  // origin's resize fans out and mirrors stay in lock-step.
  const useColumnMapPos = !mirrorsLocked && columnIndex !== null;
  const mapPos = useColumnMapPos
    ? (columnMapPosOverride ?? singletonMapPos)
    : singletonMapPos;
  const setMapPos = useCallback(
    (next) => {
      if (useColumnMapPos) setColumnMapPos(columnIndex, next);
      else setSingletonMapPos(next);
    },
    [useColumnMapPos, columnIndex, setColumnMapPos, setSingletonMapPos],
  );

  // Mirror columns are *layout-editable* when the user has
  // unlocked mirrors via the title-row lock toggle. Origin is
  // always layout-editable. Structural editing (add/delete card,
  // add/edit/delete plot) is governed by `lockedReadOnly` and
  // stays origin-only regardless — the comparison view assumes
  // every column shares the same row skeleton.
  const layoutEditableHere = !lockedReadOnly || !mirrorsLocked;

  // True while the user is actively dragging or resizing a tile.
  // Used to add `DRAG_BUFFER_COLS` of east-edge headroom only
  // during the gesture — at rest the column hugs its content (no
  // trailing whitespace), and the moment a drag/resize starts rgl
  // gets the room it needs to grow the rightmost tile.
  const [isInteracting, setIsInteracting] = useState(false);
  const startInteract = useCallback(() => setIsInteracting(true), []);
  const stopInteract = useCallback(() => setIsInteracting(false), []);

  // Mirror cards carry the alignment revision in their layout `i`
  // and DOM `key` so Refresh forces a full rgl rebuild from the
  // resynced positions (rgl's internal layout state can drift from
  // the layout prop). Origin's keys are stable so its plots don't
  // remount on click. Mirrors keep the suffix in both lock states —
  // unlocked mirrors still need the rebuild after Refresh copies
  // origin's positions back into them.
  const cardKey = (cardId) =>
    lockedReadOnly ? `${cardId}::r${alignmentRevision}` : cardId;

  const scenario = columnDef.scenario;
  const whatif = columnDef.whatif || null;

  // Per-column camera centre. Decouples lat/lng from the singleton
  // so compare-mode columns can show different cities (e.g. Zurich
  // vs Singapore) while still syncing zoom / bearing / pitch via
  // the singleton. `Map.jsx` reads this through `MapColumnContext`.
  const [columnCenter, setColumnCenter] = useState(null);
  const { data: columnInputs } = useInputs(scenario ? { scenario } : undefined);
  const columnRefitVersion = useCanvasStore((s) => s.columnRefitVersion);
  const bumpColumnRefitVersion = useCanvasStore(
    (s) => s.bumpColumnRefitVersion,
  );
  // Re-seed the column's centre from the zone bbox when its data
  // lands and whenever the refresh button bumps `columnRefitVersion`.
  // `useInputs` is shared via React Query so the primary tile and
  // this effect see the same cached fetch.
  useEffect(() => {
    const zone = columnInputs?.geojsons?.zone;
    if (!zone) return;
    try {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(zone);
      setColumnCenter({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
      });
    } catch {
      // Malformed geometry — leave the centre unset and let Map.jsx
      // fall through to the singleton viewState.
    }
  }, [columnInputs, columnRefitVersion]);

  // Non-origin columns in compare mode keep per-column editing
  // for individual plots' parameters (`onEditPlot`) and the
  // map-card bottom flow (`onOpenMapBottom`). Everything that
  // changes the row's *structure* — adding a new card, adding a
  // plot to a card, deleting a plot, deleting the whole card,
  // dragging / resizing layout — is origin-only and fans out
  // across columns at the store layer so the row skeleton stays
  // consistent.
  if (lockedReadOnly) {
    onAddCard = undefined;
    onDeleteCard = undefined;
    onAddPlotToCard = undefined;
    onDeletePlot = undefined;
  }
  const showPerimeterPlus = enableEdit && !lockedReadOnly;

  // The title-map tile reserves rows underneath the map for the
  // use-type / construction legend (`legendExtraRows`). The map area
  // itself stays fixed at `mapPos.h` rows; the legend lives in the
  // reserved bump; `+` button stays anchored to the tile's true
  // bottom edge; cards below shift to make room.
  const colorMode = useMapStore((s) => s.colorMode);
  // Per-column colour maps derived from this column's own zone
  // features. Drives both the column's title-map legend and the
  // building geometry colours via `MapColumnContext` — without
  // column-local maps every column rendered the singleton's
  // last-written archetypes (e.g. Zurich's STANDARD list overwriting
  // Singapore's once its zone data landed).
  const columnZoneFeatures = columnInputs?.geojsons?.zone?.features;
  const constructionColorMap = useMemo(
    () =>
      columnZoneFeatures
        ? generateConstructionColorMap(columnZoneFeatures)
        : {},
    [columnZoneFeatures],
  );
  const useTypeColorMap = useMemo(
    () =>
      columnZoneFeatures ? generateUseTypeColorMap(columnZoneFeatures) : {},
    [columnZoneFeatures],
  );
  const columnContextValue = useMemo(
    () => ({
      center: columnCenter,
      setCenter: setColumnCenter,
      constructionColorMap,
      useTypeColorMap,
    }),
    [columnCenter, constructionColorMap, useTypeColorMap],
  );

  // Title-map tile sizing: each column publishes the row allowance
  // it needs for its own legend; every column then takes the *max*
  // across the row so the tile is identical and the column with the
  // tallest legend lands at zero (modulo rgl row rounding) whitespace
  // below its legend, while shorter columns pad up to the same tile
  // bottom. Without max-across, the tallest mirror would overflow
  // when origin reserved less.
  //
  // Pixel budget for one legend (matches the rendered DOM):
  //   header  31  = 13 px font @ ~1.2 lh + 6 paddingBottom + 1 border
  //                + 8 marginBottom
  //   entries (24n − 8)  = 16 px swatch row × n + 8 gap × (n − 1)
  //   bottom padding 2
  //   chrome  22  = 14 drag-handle + 8 legend marginTop above the
  //                legend, sitting in the same reserved span
  // Total = 24n + 47. Rounded up to whole grid rows.
  const ownLegendExtraRows = useMemo(() => {
    let entries = 0;
    if (colorMode === COLOR_MODES.CONSTRUCTION_STANDARD)
      entries = Object.keys(constructionColorMap).length;
    else if (colorMode === COLOR_MODES.USE_TYPE)
      entries = Object.keys(useTypeColorMap).length;
    if (entries === 0) return 0;
    const px = 24 * entries + 48;
    return Math.ceil(px / (ROW_HEIGHT_PX + GRID_MARGIN[1]));
  }, [colorMode, constructionColorMap, useTypeColorMap]);
  const columnLegendRows = useCanvasStore((s) => s.columnLegendRows);
  const setColumnLegendRows = useCanvasStore((s) => s.setColumnLegendRows);
  // Stable key per column. `columnIndex === null` is the launch view
  // (single column), kept distinct from compare-mode column 0.
  const columnLegendKey = columnIndex ?? 'launch';
  // Two effects: the publish runs whenever the value changes; the
  // cleanup *only* runs on unmount or column-key change. Combining
  // them removed and re-added the entry on every value change, which
  // briefly dropped this column from the max calculation.
  useEffect(() => {
    setColumnLegendRows(columnLegendKey, ownLegendExtraRows);
  }, [columnLegendKey, ownLegendExtraRows, setColumnLegendRows]);
  useEffect(() => {
    return () => setColumnLegendRows(columnLegendKey, null);
  }, [columnLegendKey, setColumnLegendRows]);
  const legendExtraRows = useMemo(
    () => Math.max(0, ...Object.values(columnLegendRows)),
    [columnLegendRows],
  );

  // Sort cards by row before rendering. react-grid-layout v2's
  // layout-prop sync sometimes uses children DOM order to anchor
  // positions, so a mirror column receiving a new `layout` prop
  // (with reordered y values) wouldn't visually re-arrange unless
  // the children themselves are emitted in the new visual order.
  // Sorting here keeps DOM order in lock-step with layout order
  // for both origin and mirrors. Stable sort: equal rows keep
  // their relative order from the source list.
  const sortedCards = useMemo(() => {
    const indexed = cards.map((c, i) => ({ c, i }));
    indexed.sort((a, b) => {
      const ay = a.c.row ?? 0;
      const by = b.c.row ?? 0;
      if (ay !== by) return ay - by;
      return a.i - b.i;
    });
    return indexed.map((entry) => entry.c);
  }, [cards]);

  const layout = useMemo(() => {
    // Title map: origin-owned when mirrors are locked (singleton
    // mapPos fans out to every column). When unlocked, each column
    // owns its own `mapPos` via `columnMapPos` so mirror resizes
    // stay local.
    const mapEditable = !layoutLocked && layoutEditableHere;
    // Feature cards: editable on origin always, on mirrors only
    // when `mirrorsLocked === false`. When locked, mirrors are
    // `static: true` so rgl's auto-compaction doesn't re-pack
    // them by insertion order while their stored `row` values
    // reflect origin's positions.
    const cardsEditable = !layoutLocked && layoutEditableHere;
    const items = [
      {
        i: 'MAP',
        x: mapPos.x,
        y: mapPos.y,
        w: mapPos.w,
        h: mapPos.h + legendExtraRows,
        minW: CARD_MIN_W,
        minH: CARD_MIN_H + legendExtraRows,
        isDraggable: mapEditable,
        isResizable: mapEditable,
        static: !mapEditable,
      },
    ];
    for (const card of sortedCards) {
      // Compact layout pins every card to the column-left (single
      // vertical stack). Width stays at the card's stored `w`.
      const cardX = compactLayout ? 0 : (card.col ?? 0);
      const cardW = card.w ?? DEFAULT_CARD_W;
      // Text + divider cards can shrink past the global 3-row /
      // 3-col minimum that keeps plot/map/kpi cards legible —
      // annotations hug the rendered text and dividers can be a
      // single unit thick on whichever axis is the line.
      const isText = card.type === 'text';
      const isDivider = card.type === 'divider';
      const minH = isText || isDivider ? 1 : CARD_MIN_H;
      const minW = isDivider ? 1 : CARD_MIN_W;
      items.push({
        i: cardKey(card.id),
        x: cardX,
        y: card.row ?? 0,
        w: cardW,
        h: card.h ?? DEFAULT_CARD_H,
        minW,
        minH,
        isDraggable: cardsEditable,
        isResizable: cardsEditable,
        static: !cardsEditable,
      });
    }
    return items;
  }, [
    sortedCards,
    mapPos,
    legendExtraRows,
    layoutLocked,
    lockedReadOnly,
    layoutEditableHere,
    compactLayout,
    alignmentRevision,
  ]);

  // Grid width tracks the right-most tile + a `DRAG_BUFFER_COLS`
  // headroom so the rightmost card always has room to drag/resize
  // east. Without the buffer, react-grid-layout's
  // `cols === rightmost edge` constraint pins resize at the
  // card's current width.
  //
  // The buffer is *only* applied during an active drag/resize
  // gesture — at rest the column hugs its widest tile, so there's
  // no trailing whitespace. The buffer kicks in on
  // `onDragStart`/`onResizeStart`, gives rgl the headroom it needs
  // for the gesture, and is removed again on stop. Mirrors
  // (lockedReadOnly) and locked layouts never need it.
  const { effectiveCols, gridWidthPx } = useMemo(() => {
    let maxRight = MIN_COLS;
    for (const item of layout) {
      const right = item.x + item.w;
      if (right > maxRight) maxRight = right;
    }
    const allowBuffer = isInteracting && !layoutLocked && layoutEditableHere;
    const buffer = allowBuffer ? DRAG_BUFFER_COLS : 0;
    const cols = Math.max(MIN_COLS, maxRight + buffer);
    return {
      effectiveCols: cols,
      gridWidthPx: widthForCols(cols),
    };
  }, [layout, layoutLocked, layoutEditableHere, isInteracting]);

  // react-grid-layout fires this on mount AND on every drag/resize.
  // The per-card diff in the store's `applyCardLayouts` skips writes
  // when nothing actually changed.
  const handleLayoutChange = useCallback(
    (nextLayout) => {
      // Locked mirrors never propagate — their cards are `static:
      // true`. Unlocked mirrors propagate *only* feature-card
      // positions (their column's `applyCardLayouts`); they never
      // touch `mapPos` because it's a singleton owned by origin.
      if (lockedReadOnly && mirrorsLocked) return;
      const cardUpdates = [];
      for (const item of nextLayout) {
        if (item.i === 'MAP') {
          // The fed-in layout has `legendExtraRows` baked in, so
          // strip it out before storing — `mapPos.h` is the user's
          // intended map height (no legend). `setMapPos` routes to
          // the singleton or this column's `columnMapPos` slot
          // depending on `mirrorsLocked`; both setters dedup so the
          // mount-time fire is a no-op.
          const userH = Math.max(CARD_MIN_H, item.h - legendExtraRows);
          setMapPos({ x: item.x, y: item.y, w: item.w, h: userH });
        } else {
          // Compact mode: persist row / w / h. Skip `col` — every
          // card is pinned to x=0 by the layout memo, so writing
          // it back would just clobber the user's free-form `col`
          // stored from launch view (we want the original layout
          // to survive a round-trip back). Width persists so the
          // user can resize cards horizontally on the origin
          // column and have every mirror follow.
          // Mirror cards carry an `::r<rev>` suffix on their rgl
          // `i`; strip it so `applyCardLayouts` finds the card by
          // its real id when an unlocked mirror persists positions.
          const cardId = item.i.split('::')[0];
          if (compactLayout) {
            cardUpdates.push({
              id: cardId,
              row: item.y,
              w: item.w,
              h: item.h,
            });
          } else {
            cardUpdates.push({
              id: cardId,
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
    [
      onApplyLayouts,
      legendExtraRows,
      compactLayout,
      lockedReadOnly,
      mirrorsLocked,
      setMapPos,
    ],
  );

  // Card auto-grow: FeatureCard reports its preferred pixel height
  // (sum of plot natural heights + chrome). Grow card.h to fit
  // whenever the report exceeds the previous report for the same
  // card — that way adding a 2nd/3rd plot keeps growing, while the
  // re-renders triggered by other layout changes don't undo a
  // user-driven shrink (same totalPx → no-op).
  // The "previous report" is persisted on the card itself
  // (`maxReportedHeightPx`), not in a per-instance ref. Without
  // persistence, every page reload reset the ref to empty, and
  // the plot's first natural-height report would force-grow
  // user-shrunk cards back up. With it, a user who manually
  // shrank a card below the plot's natural height keeps that
  // shrink across reloads — the plot may render clipped, but
  // that's the user's choice. Auto-grow still fires when:
  //   - a brand-new card with no `maxReportedHeightPx` mounts and
  //     its plot reports a height > 0 (initial size-to-fit), or
  //   - the user adds another plot to an existing card and the
  //     stacked height exceeds whatever was reported before.
  const handlePreferredHeight = useCallback(
    (cardId, totalPx) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const prev = card.maxReportedHeightPx ?? 0;
      if (totalPx <= prev) return;
      // Invert rgl's tile-pixel formula: tilePx = h * ROW_HEIGHT +
      // (h - 1) * marginY → h = ceil((tilePx + marginY) / step).
      const required = Math.ceil(
        (totalPx + GRID_MARGIN[1]) / (ROW_HEIGHT_PX + GRID_MARGIN[1]),
      );
      // Always persist the new max so future identical reports
      // are no-ops. Only push a new `h` when the card actually
      // needs to grow — otherwise we'd undo a user-driven
      // resize that happened to set h above `required`.
      const patch = { id: cardId, maxReportedHeightPx: totalPx };
      if (card.h < required) patch.h = required;
      onApplyLayouts?.([patch]);
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
      if (!onAddCard)
        return {
          mapItems: [],
          plotItems: [],
          onPickText: null,
          onPickDivider: null,
        };
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
      // Text card has no nested options — clicking the pill just
      // adds an empty text card. Per-column content is whatever the
      // user types in each column; the row itself is mirrored.
      const onPickText = () =>
        onAddCard({ targetCardId, direction, type: 'text' });
      // Divider card mirrors the same flat-pick pattern; orientation /
      // style / thickness are edited inside the card's own toolbar
      // and the config is fanned out across columns.
      const onPickDivider = () =>
        onAddCard({ targetCardId, direction, type: 'divider' });
      return { mapItems, plotItems, onPickText, onPickDivider };
    },
    [onAddCard, mapData],
  );

  let headerText = scenario;
  if (columnDef.type === 'whatif' && columnDef.whatif) {
    headerText = `${scenario}: ${columnDef.whatif}`;
  }

  return (
    <MapColumnContext.Provider value={columnContextValue}>
      <div style={{ ...columnStyle, ...style }}>
        {/* Title card + optional badges / close. The Origin badge
          on the leftmost compare column makes the
          "edit-once-mirror-everywhere" affordance discoverable
          (only the origin shows Edit / Delete / `+`). The `×`
          close on non-origin columns drops that scenario /
          what-if from the comparison via `removeColumn(i)`. */}
        <div style={titleRowStyle}>
          <div style={titleCardStyle}>
            {isOrigin && <span style={originBadgeStyle}>Current</span>}
            {/* Cap the rendered name at 75% of the column's grid
              width so a long scenario name
              (`_ZRH_ copy 2_morph_stochastic`) doesn't blow the
              title card past its column. The full name is preserved
              in the `title` attribute for hover. */}
            <div
              style={{
                ...headerStyle,
                maxWidth: gridWidthPx * 0.75,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={headerText}
            >
              {headerText}
            </div>
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
          {/* Refresh resyncs every mirror to origin's positions /
            sizes / order and refits each column's map to its zone
            bbox. Lock toggles `mirrorsLocked` — on: mirrors track
            origin; off: each column edits its own layout. Structural
            edits (add/delete card, add/edit/delete plot) stay
            origin-only either way. */}
          {compactLayout && isOrigin && enableEdit && (
            <>
              <div className="cea-card-icon-button-container">
                <Tooltip
                  title="Realign mirrors to current and refit maps"
                  placement="bottom"
                >
                  <Button
                    type="text"
                    icon={<RefreshIcon />}
                    onClick={() => {
                      resyncMirrorsToOrigin();
                      bumpAlignmentRevision();
                      bumpColumnRefitVersion();
                    }}
                    aria-label="Refresh comparison"
                  />
                </Tooltip>
              </div>
              <div className="cea-card-icon-button-container">
                <Tooltip
                  title={
                    mirrorsLocked
                      ? 'Unlock mirrors - let each column edit its own layout'
                      : 'Lock mirrors - every column follows Current'
                  }
                  placement="bottom"
                >
                  <Button
                    type="text"
                    icon={mirrorsLocked ? <LockOnIcon /> : <LockOffIcon />}
                    onClick={() => setMirrorsLocked(!mirrorsLocked)}
                    aria-label={
                      mirrorsLocked ? 'Unlock mirrors' : 'Lock mirrors'
                    }
                  />
                </Tooltip>
              </div>
            </>
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
            onDragStart={startInteract}
            onDragStop={stopInteract}
            onResizeStart={startInteract}
            onResizeStop={stopInteract}
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
              <div style={mapFillStyle(mapPos.h)}>
                <CanvasMap
                  project={project}
                  scenario={scenario}
                  // Origin only — mirror title maps share the
                  // singleton view-state / visibility, so a mirror
                  // toolbar would silently drive origin's state
                  // (misleading clutter). Per-column title-map
                  // independence is a separate follow-up.
                  showToolbar={enableEdit && !lockedReadOnly}
                />
              </div>
              <ConstructionStandardLegend
                style={overviewLegendStyle}
                constructionColorMapOverride={constructionColorMap}
                useTypeColorMapOverride={useTypeColorMap}
              />
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
            {sortedCards.map((card) => (
              <div
                key={cardKey(card.id)}
                style={tileStyle}
                className="cea-canvas-tile"
              >
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
                ) : card.type === 'text' ? (
                  <FeatureCardText
                    card={card}
                    columnIndex={columnIndex}
                    onDeleteCard={
                      onDeleteCard ? () => onDeleteCard(card.id) : undefined
                    }
                  />
                ) : card.type === 'divider' ? (
                  <FeatureCardDivider
                    card={card}
                    columnIndex={columnIndex}
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
                    columnIndex={columnIndex}
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
                    // Auto-grow is owned by the origin column. Mirror
                    // columns skip the report — otherwise every
                    // Realign-click remounts the mirror's plot, which
                    // re-measures slightly larger (now-grown card has
                    // more chrome) and writes back to `sharedCards.h`,
                    // compounding the height on every refresh.
                    onPreferredHeight={
                      lockedReadOnly ? undefined : handlePreferredHeight
                    }
                  />
                )}
                {showPerimeterPlus && (
                  <PerimeterPlusButtons
                    targetCardId={card.id}
                    exposure={exposureMap[cardKey(card.id)]}
                    buildSectionMenus={buildSectionMenus}
                    hideRight={compactLayout}
                  />
                )}
              </div>
            ))}
          </GridLayout>
        </div>
      </div>
    </MapColumnContext.Provider>
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
  // Small clearance so the title doesn't sit flush against the
  // canvas-card edge when the column scrolls — but trimmed from
  // the original 16 px to bring the title closer to the canvas
  // top in both launch and compare layouts.
  paddingTop: 4,
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
// CEA accent purple — matches the navigator toggles' "on" track,
// the canvas-purple blink animation, and the CompareModal's OK
// button. Keeps the comparison-mode chrome visually unified.
const originBadgeStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#fff',
  background: CEA_PURPLE,
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

// Tile lays out as a flex column: drag handle, fixed-pixel map,
// then the legend at its natural height, with whitespace filling any
// remaining tile height. Layout sizing is in `mapFillStyle` below.
const mapTileStyle = {
  ...tileStyle,
  display: 'flex',
  flexDirection: 'column',
};

// Pin the map to the user-set `mapPos.h` rows in pixels so every
// column's map renders at the same size regardless of how many legend
// entries that column happens to have. `flexShrink: 0` is the part
// that *enforces* the size — without it, a tall legend in the same
// flex column would push against the tile's bottom edge and the map
// would shrink to make room ("eaten" look).
const mapFillStyle = (mapPosH) => ({
  width: '100%',
  height: mapPosH * ROW_HEIGHT_PX + (mapPosH - 1) * GRID_MARGIN[1],
  flexShrink: 0,
});

// Strip the floating-card chrome so the legend reads as part of the
// tile rather than a popover. Horizontal padding (16px) matches
// `FeatureCardShell.cardStyle` so the legend's swatches + labels
// align with content in neighbouring FeatureCards.
const overviewLegendStyle = {
  width: '100%',
  marginTop: 8,
  boxShadow: 'none',
  backgroundColor: 'transparent',
  padding: '0 16px 2px',
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

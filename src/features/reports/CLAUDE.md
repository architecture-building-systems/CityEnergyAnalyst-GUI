# Reports Feature

Side-by-side comparison dashboard. Three comparison modes (inter-scenario,
inter-whatif, inter-feature), a Zustand store for view + card state, a
`react-grid-layout` canvas for free-form tile placement, and Plotly-based
charts with optional y-axis alignment across columns sharing a slot id.

## Main API
- `useReportsStore()` - View, columns, and card CRUD.
- `useFetchScenarios(project)` - Sibling scenario names.
- `useFetchWhatifs(project, scenario)` - What-if names under a scenario.
- `useFetchFeatures()` - Available plot features for `FeaturePicker`.
- `useFetchSummary(project, scenario, feature, whatif?)` - KPI strip
  payload.
- `useFetchCustomPlot(plotConfig, scenario)` - Plotly figure HTML; the
  only fetcher used at render time (every Reports plot has a script).
- `useFetchToolParams(script, scenario)` - Plot-tool parameter schema.
- `useYAxisAlignment(enabled, numColumns)` - Post-render Plotly hook
  that unifies y-axis range across columns sharing a slot id.
- `ReportsPage` - Top-level page; routes between `LaunchView` and
  `ComparisonView` based on `useReportsStore.view`.

## Views & cards

Each view owns a list of columns. Columns hold cards. A card's `type`
field decides which body component renders it.

```
Card {
  id, type, row, col, w, h,
  feature?,                          // 'plot' / 'kpi'
  plots?: [{ id, plotConfig }],      // 'plot'
  category?, layer?,                 // 'map'
}
```

| `type`  | Body                | Purpose                                       |
|---------|---------------------|-----------------------------------------------|
| `plot`  | `FeatureCardPlot`   | Stacked Plotly plots + "Add a plot" pill      |
| `kpi`   | `FeatureCardKpi`    | Single KPI strip for the feature              |
| `map`   | `FeatureCardMap`    | Mirrors the column's primary map widget       |

Card positions are sparse 2D grid coordinates in `react-grid-layout`
units (`COL_WIDTH_PX`/`ROW_HEIGHT_PX` in `ReportColumn`). The column's
primary map is a virtual tile pinned at `(0, 0)`; feature cards never
occupy that slot.

| View              | Columns                          | Card storage     |
|-------------------|----------------------------------|------------------|
| `launch`          | 1 (local)                        | `useState`       |
| `inter-scenario`  | 1 per sibling scenario           | `sharedCards`    |
| `inter-whatif`    | 1 per what-if under parent       | `sharedCards`    |
| `inter-feature`   | 1 per (scenario, feature) pair   | `columnCards[i]` |

## Key Patterns

### DO: Dispatch on `card.type` in `ReportColumn`
```jsx
{card.type === 'kpi' ? (
  <FeatureCardKpi card={card} ... />
) : card.type === 'map' ? (
  <FeatureCardMap card={card} ... />
) : (
  <FeatureCardPlot card={card} ... />
)}
```
Each card variant wraps its body in `FeatureCardShell` (shared chrome:
white surface + title row with icon, label, and optional Edit / Delete
buttons). Variants compute their own `title` + `icon` and pass them in.

### DO: Route card/plot actions through `columnIndex` (`null` for shared)
```jsx
const columnIndex = isFeatureMode ? i : null;
addCard(columnIndex, { targetCardId, direction, type, feature, plotConfig,
                       category, layer });
addPlot(columnIndex, cardId, plotConfig);
updatePlot(columnIndex, cardId, plotId, plotConfig);
removePlot(columnIndex, cardId, plotId); // drops the card if last plot
applyCardLayouts(columnIndex, updates); // batched drag/resize results
```
The store's `getCards(columnIndex)` / `setCards(columnIndex, next)`
helpers abstract shared-vs-per-column dispatch so each action body
doesn't branch on view mode. `addCard` carries `type` plus the
type-specific fields; unrelated fields are simply `undefined`.

### DO: Build the `+` picker top level Map / Plot / KPI from live data
```jsx
const mapData = useMapLayerCategories();
items: [
  { key: 'map', label: 'Map', children: mapData.categories.flatMap(...) },
  { key: 'plot', label: 'Plot', children: buildPlotMenuItems(...) },
  { key: 'kpi', label: 'KPI', disabled: true },
]
```
Map's submenu mirrors the backend's category → layer tree from
`useMapLayerCategories()` — never hardcoded. Plot's submenu is the
existing nested feature → leaf picker derived from `PLOT_GROUPS`. KPI
is greyed out until its backend selection module lands.

### DO: Use `react-grid-layout` for tile placement, not CSS Grid
Every tile (primary map + feature cards) is a draggable, resizable child
of `<GridLayout>`. The library handles collision detection + vertical
auto-compaction, so cards push neighbours only when they would actually
overlap, never overlap each other, and unrelated cards stay put.
Position state (`{x, y, w, h}`) is persisted via `onLayoutChange →
onApplyLayouts(updates)`.

### DO: Pin map tile size with explicit `MAP_ANCHOR_W/H` units
The primary map's launch footprint is exactly 6×5 grid units, working
out to 500×280 px at the configured `COL_WIDTH_PX` (70) /
`ROW_HEIGHT_PX` (40) / `GRID_MARGIN` ([16, 20]). The same
`MAP_ANCHOR_W/H` constants are exported from `reportsStore.js` so the
"insert next to MAP" anchor logic in `LaunchView.insertCard` and the
store's `insertCardInto` agree with the column's grid math.

### DO: Add a `DRAG_BUFFER_COLS` to `effectiveCols`
Without spare columns past the rightmost tile, react-grid-layout's
`cols === item.x + item.w` constraint pins the rightmost card east-side.
`DRAG_BUFFER_COLS` (= `CARD_MIN_W`) gives every card at least one
card-min-width's worth of slack to drag east; the canvas grows with it.

### DO: Use the absolute position strategy (no transform)
```jsx
import { setTopLeft } from 'react-grid-layout';

const absolutePositionStrategy = {
  type: 'absolute',
  scale: 1,
  calcStyle: setTopLeft,
};
```
The library's default `transform: translate(...)` with a CSS transition
on width/height fires deck.gl's WebGL ResizeObserver mid-animation,
before the device is ready, producing a `maxTextureDimension2D` error
and a half-broken map on first mount. `left/top` skips both the
transform and the transition so deck.gl sees the final tile size on
first measurement.

### DO: Render the map toolbar with inline-styled buttons, not `MapControls`
`ReportMap` defines `InlineLayerToggle` / `InlineExtrudeButton` /
`InlineResetCameraButton` / `InlineResetCompassButton` locally with
fully explicit inline styles. Reusing the main viewport's `MapControls`
left first-paint races where `Toolbar.css`'s 40×40 / 8 px-padded
defaults beat the Reports-scoped overrides and the icons would land in
the NW of the frame until a later layout pass settled. Inline styles
on a unique wrapper make the cascade irrelevant.

### DO: Initialise layer visibility + colour mode in `ReportMap`
`useMapStore` is a singleton shared with the main viewport. When Reports
is the entry point, no other component has flipped layer visibility on
yet — so `ReportMap` itself runs the first-load init (visibility = true
for every key in `data`, colour mode = CONSTRUCTION_STANDARD) on its
own first render. Skip these and the toolbar appears but the map stays
blank.

### DO: Always seed plots with a `plotConfig.script`
Every plot on the canvas has a script; `useFetchCustomPlot` is the only
path. The legacy `useFetchReportPlot` (feature-based) was removed
because no UI path could reach it. Adding a plot always opens
`PlotEditModal`, which never returns without a populated `plotConfig`.

### DO: Render Map cards with the same `<ReportMap>` widget as the primary tile
```jsx
const FeatureCardMap = ({ card, ... }) => {
  const [store] = useState(() => createMapInstanceStore({ category, layer }));
  // ...register store under card.id so BottomCard can find it...
  return (
    <MapInstanceContext.Provider value={store}>
      <FeatureCardShell ...>
        <ReportMap project={project} scenario={scenario} />
        <Legend style={legendOverrideStyle}
                extras={<LegendFilterRow layers={[layerInfo]} />} />
      </FeatureCardShell>
    </MapInstanceContext.Provider>
  );
};
```
The card mirrors the primary map's chrome (4-button toolbar, DeckGL
overlay) and embeds the Legend below the map so a Map card reads as a
self-contained "map + legend" tile. Each card owns a per-card
`mapInstance` store (`category`, `selectedMapLayer`,
`mapLayerParameters`, `mapLayers`, `mapLayerLegends`, `range`); scoped
hooks read from the per-card store inside the provider and fall back
to the singleton outside it (main viewport, plot-edit flow).
View-state — camera, zoom, layer-type visibility, colour mode — and
filter values (`scale`, `radius`) stay singleton.

### DO: Set `range` from inside `useGetMapLayers`
On the singleton, `range` is normally set by `Legend`'s `useEffect`
whenever the layer data lands. The BottomCard's Legend is hidden
(`hideLegend`) so the fetch hook itself extracts
`properties.range[firstKey]` and writes it on the active store.
Without this, `HexagonLayer.elevationDomain` collapses to `[0, 0]`
and the colour gradient pins everything to the first stop — visible
symptom is "data fetched, map blank". The embedded Legend in
`FeatureCardMap` can still write range when the user toggles between
total / period range modes.

### DO: Auto-grow Plot cards to fit chart natural heights
```jsx
// FeatureCardPlot accumulates per-plot natural heights reported by
// ReportPlot's `onNaturalHeight(heightPx)` callback, sums + chrome,
// reports upward as `onPreferredHeight(cardId, totalPx)`.
// ReportColumn keeps a Map<cardId, lastReported> so it grows whenever
// a fresh report exceeds the previous, never on equal/smaller reports
// (so user-driven shrinks aren't undone by re-renders).
```
Sankey-style figures with backend-baked pixel heights drive the growth.
Charts without explicit `layout.height` report nothing and autosize
inside whatever the user has set.

### DO: Fit Plotly figures to their container on resize
```jsx
// ReportPlot — ResizeObserver skips its first fire (initial mount),
// then on every later fire calls `fitPlotToParent` per
// `.plotly-graph-div`: clears inline width/height, calls
// `Plotly.relayout({ width, height })` with the parent's measured
// pixel dims, then `Plots.resize(div)`.
```
`autosize: true` alone doesn't reflow Sankey/parallel-coords/treemap
figures the backend serialised with `update_layout(autosize=False)`.
Writing explicit pixel dimensions does. Skipping the first RO fire
is what lets the auto-grow request land before the chart gets crammed
into the default-size card.

### DO: Open `MapLayerProperties` at the bottom for both Plot and Map flows
`ReportsPage` carries two parallel switches: `drawer` (plot-tool drawer
open) and `mapBottomOpen` (map-card flow). Either condition opens the
bottom row hosting `MapLayerPropertiesCard`. Plot edit pushes the
singleton via `PlotEditModal`'s `scriptToMapLayer` →
`findCategoryForLayer`. Map cards push the singleton on mount and on
edit. The bottom card renders a close button only in map-only mode
(plot drawer has its own close).

### DO: Let the canvas hug its content
```jsx
const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '16px 72px 72px 16px', // 72 px = button overhang + clearance
  width: 'fit-content',
  height: 'fit-content',
};
```
Right/bottom padding is sized so the absolutely-positioned `+` buttons
hanging off the map's edges don't touch the canvas border. `fit-content`
stops `ReportsPage`'s grid cell from stretching the canvas to full row
height.

### DO: Sticky title row so headers stay visible on scroll
```jsx
const titleRowStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 4,
  background: '#fff',
  paddingTop: 16,
  paddingBottom: 8,
};
```
Pinned to the canvas cell's scroll viewport. `paddingTop` keeps the
title card off the canvas card's top edge when stuck (otherwise the
two share `y = 0` and the title kisses the rounded corner). The white
background hides grid content scrolling underneath.

### DON'T: Add `overflowX: auto` to `columnsRowStyle`
A horizontal-scroll ancestor between the sticky title row and the
canvas cell would intercept sticky's "nearest scrolling ancestor"
lookup and break the vertical pin. Horizontal overflow falls through
to the canvas cell, which already has `overflow: auto` for both axes.

### DO: Place perimeter `+` buttons on exposed edges only
For each tile, `computeExposure(layout)` walks the right and bottom
edges, collects the lateral intervals where other tiles touch, and
finds the longest *exposed* segment (any gap is an exposed segment).
The `+` button only renders when the exposed segment is at least
`PLUS_BUTTON_MIN_EDGE_PX` (~95 px = 2.5 × button height) and is
positioned at the segment's centre as a `0..1` fraction of the edge.
Cramped slivers and fully-blocked edges hide the button outright.

### DO: Reuse the main viewport's `<Tool>` for the plot form
```jsx
<PlotTool key={selectedScript} script={selectedScript} onRunOverride={...} />
```
`<Tool>` renders the same header, parameter list, and Run button as
the main viewport's tool card. Reports overrides Run via
`onRunOverride` — when present, `ToolFormButtons.runScript` calls it
with validated form values instead of creating a job, and the Save /
Reset buttons hide. Picker phase uses `<PlotChoices>` for visual
parity.

### DO: Use `cea-template-select` for the in-card "Add a plot" pill
```jsx
<Select
  className={`cea-template-select ${hasOptions ? '' : 'cea-template-select-empty'}`}
  placeholder="Add a plot"
  options={quickPickOptions.map((o) => ({ label: o.label, value: o.script }))}
  onSelect={(script) => onPick(script)}
  onClick={hasOptions ? undefined : onFallback}
/>
```
Same black-outlined pill the pathway builder uses. Picking a leaf
script seeds `PlotEditModal` with `{ script }` so it opens directly on
the parameter form. With no quick-pick options, clicking falls back to
opening the full `<PlotChoices>` picker.

### DO: Derive quick-pick options from `PLOT_GROUPS`
`findFamilyForFeature` (in `featureCardCommon.jsx`) walks `PLOT_GROUPS`
to find the group/subgroup that owns a card's `feature` key, then
`getQuickPickOptions` lists every sibling key. Adding a new plot to an
existing group surfaces it automatically — no parallel feature→plots
dictionary to maintain.

### DO: Stage plot configs — commit only on Run
`ReportsPage` owns drawer state. Views call
`onOpenDrawer({ plotConfig, onSave })` with an `onSave` closure that
captures their local state, so the page doesn't need to know which
view owns what. The slot is only inserted when `onSave` fires (i.e.
the user clicks Run inside the drawer).

### DO: Align y-axes only when columns share a slot id
```jsx
const { handlePlotReady } = useYAxisAlignment(
  !isFeatureMode && columns.length > 1,
  columns.length,
);
```
Disabled in inter-feature mode — each column has its own card list, so
there's no shared slot to align across.

### DO: Confirm before clearing comparison state
```jsx
Modal.confirm({
  title: 'Start over?',
  content: 'This will clear all comparison columns and return to the launch view.',
  onOk: startOver,
});
```

### DO: Auto-enter a mode when there is only one choice
```jsx
if (scenarios.length <= 1) enterInterScenario([scenario]);
else setPickerMode('scenario');
```

### DO: Re-index `columnCards` when removing a column
```jsx
// columnCards is keyed by column index — keep the keys contiguous.
Object.keys(columnCards).forEach((key) => {
  const k = Number(key);
  if (k < index) newColumnCards[k] = columnCards[k];
  else if (k > index) newColumnCards[k - 1] = columnCards[k];
});
```

### DO: Deduplicate columns on add
```jsx
const isDuplicate = columns.some((c) => c.type === column.type && ...);
if (isDuplicate) return;
```

### DO: Drive header navigation through the navigation store
```jsx
const { push } = useNavigationStore();
push(routes.PROJECT);
```

### DO: Guard API hooks with `enabled` flags
```jsx
useQuery({
  queryKey: ['reports', 'whatifs', project, scenario],
  enabled: !!project && !!scenario,
  ...
});
```

### DO: Treat y-axis alignment as a side effect, not a data transform
Walk the DOM for `.js-plotly-plot` nodes after render, read their
rendered y-range, compute a shared range, write it back via
`Plotly.relayout`. Pre-computing aligned ranges in the data layer
won't work — the layout only converges after Plotly has sized the
axes.

### DO: Follow the pathway colour palette
- Primary blue:  `#1470AF`  (action circles, primary buttons)
- Dark:          `#000`     (high-contrast solid selects)
- Accent:        `#AC6080`  (custom / alternative state)
- Neutral:       `#CBD5E1`  (inactive default)
- Error:         `#f04d5b`  (validation errors, delete icons)
- Info icon:     `#94A3B8`  (tooltips)

### DON'T: Ship disabled-but-visible buttons
A perma-disabled button reads as "the feature is broken". Hide the
control until the feature lands, or wrap a "Coming soon" tooltip.
Exception: the `+` picker's KPI top-level item is intentionally greyed
out as a structural placeholder for the future selection module.

### DON'T: Persist `LaunchView` state into the store
Launch is a throwaway preview — its cards reset the moment a real
comparison view is entered. Promoting its state would create a second
source of truth for card config that the comparison views never read.

## Related Files
- `stores/reportsStore.js` - View state machine, card CRUD, default
  card / map-anchor constants.
- `hooks/useReportsData.js` - React Query wrappers for `/api/reports/*`.
- `hooks/useYAxisAlignment.js` - Debounced Plotly y-axis unifier.
- `components/ReportsPage.jsx` - Top-level grid (nav + canvas + bottom
  + plot tool); owns drawer + map-bottom state.
- `components/NavigatorCard.jsx` - Top-bar navigator (Return, Start
  Over, mode label).
- `components/BottomCard.jsx` - Map-layer properties form, opened by
  Plot drawer or Map card.
- `components/LaunchView.jsx` - Single-column launch entry + 3 mode
  buttons; owns its own card list locally.
- `components/ComparisonView.jsx` - Multi-column layout with
  per-column dividers and the "+ column" button.
- `components/ReportColumn.jsx` - Column shell — sticky title row,
  then `<GridLayout>` containing the primary map tile and the
  card-type-dispatched FeatureCard variants. Owns the menu data
  (`buildSectionMenus`) consumed by the perimeter `+` buttons.
- `components/PerimeterPlusButtons.jsx` - Perimeter `+` affordance
  + animated icon-panel expansion (Map / Plot / KPI sub-Dropdowns)
  + edge-exposure geometry helpers. Lives next to `ReportColumn`
  but isolated from the grid logic.
- `components/PerimeterPlusButtons.css` - Expand/collapse keyframes
  for the icon-panel cascade.
- `components/ReportMap.jsx` - Per-column map tile (shared scenario
  data via `useInputs`) with an inline-rendered toolbar.
- `components/featureCardCommon.jsx` - `FeatureCardShell` (shared
  chrome) + `findFamilyForFeature` + shared styles.
- `components/FeatureCardPlot.jsx` - Plot-only card; vertically-stacked
  `PlotSlotCard`s + "Add a plot" pill + natural-height aggregator.
- `components/FeatureCardKpi.jsx` - KPI-only card; one KPI strip per
  feature.
- `components/FeatureCardMap.jsx` - Map-only card; mirrors the primary
  map widget for a chosen category + layer. Owns a per-card
  `mapInstance` store and publishes it in the registry.
- `components/mapInstance.js` - Per-card map state: store factory,
  scoped hooks (with singleton fallback), and the card-store
  registry consumed by `BottomCard`.
- `components/PlotSlotCard.jsx` - One plot's caption + Edit / Delete
  trio + the `<ReportPlot>` itself.
- `components/ReportPlot.jsx` - Fetches custom-plot HTML and runs
  the embedded Plotly scripts; lifts the chart title for the slot
  caption.
- `components/PlotEditModal.jsx` - Drawer card: PlotChoices picker
  → PlotTool parameter form.
- `components/CircleActionButton.jsx` - Shared blue-circle + label
  button (`sm` / `md`). Uses `CreateNewIcon` and the pathway palette.

## Icons & buttons
- Use icons from `assets/icons` (same set as pathway). Avoid
  `@ant-design/icons` — the only acceptable exceptions are
  `LeftOutlined` (no pathway equivalent for a back arrow),
  `LoadingOutlined` (pairs with antd `Spin`), and `CloseOutlined`
  (close button on `BottomCard`).
- Use `CircleActionButton` for any blue-circle + label control so new
  call sites stay visually consistent with `LaunchView`.

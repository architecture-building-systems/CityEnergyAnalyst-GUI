# Canvas Builder

Side-by-side comparison dashboard. Four comparison modes
(inter-scenario, inter-whatif, pathway-single, pathway-multi), a
Zustand store for view + card state, a `react-grid-layout` canvas for
free-form tile placement, and Plotly-based charts with optional y-axis
alignment across columns sharing a slot id.

## Main API
- `useCanvasStore()` - View, columns, and card CRUD.
- `useFetchScenarios(project)` - Sibling scenario names.
- `useFetchWhatifs(project, scenario)` - What-if names under a scenario.
- `useFetchSummary(project, scenario, feature, whatif?)` - KPI strip
  payload.
- `useFetchCustomPlot(plotConfig, scenarioContext, project)` - Plotly figure HTML; the
  only fetcher used at render time (every canvas plot has a script).
  `scenarioContext = { scenarioName, pathwayName?, year? }`. Pathway-single
  columns supply `pathwayName` + `year`; the backend resolves the child
  state via `X-CEA-Child-Scenario` header rather than a body `scenario` field.
- `useFetchToolParams(script, scenario)` - Plot-tool parameter schema.
- `useYAxisAlignment(enabled, numColumns)` - Post-render Plotly hook
  that unifies y-axis range across columns sharing a slot id.
- `CanvasPage` - Top-level page; routes between `LaunchView` and
  `ComparisonView` based on `useCanvasStore.view`.

## Views & cards

Each view owns a list of columns. Columns hold cards. A card's `type`
field decides which body component renders it.

```
Card {
  id, type, row, col, w, h,
  feature?,                          // 'plot' / 'kpi'
  plots?: [{ id, plotConfig }],      // 'plot'
  category?, layer?,                 // 'map'
  html?,                             // 'text' (TipTap HTML, per-column)
  divider?: { orientation, style, thickness },  // 'divider' (mirrored)
}
```

| `type`     | Body                  | Purpose                                       |
|------------|-----------------------|-----------------------------------------------|
| `plot`     | `FeatureCardPlot`     | Stacked Plotly plots + "Add a plot" pill      |
| `kpi`      | `FeatureCardKpi`      | Single KPI strip for the feature              |
| `map`      | `FeatureCardMap`      | Mirrors the column's primary map widget       |
| `text`     | `FeatureCardText`     | TipTap rich-text editor for annotations       |
| `divider`  | `FeatureCardDivider`  | Black horizontal / vertical rule between sections |

Card positions are sparse 2D grid coordinates in `react-grid-layout`
units (`COL_WIDTH_PX`/`ROW_HEIGHT_PX` in `CanvasColumn`). The column's
primary map is a virtual tile pinned at `(0, 0)`; feature cards never
occupy that slot.

| View                | Columns                                   | Card storage     |
|---------------------|-------------------------------------------|------------------|
| `launch`            | 1                                         | `launchCards`    |
| `inter-scenario`    | 1 per scenario (origin first)             | `sharedCards`    |
| `inter-whatif`      | 1 per what-if (origin first)              | `sharedCards`    |
| `pathway-single`    | 1 per state year of the chosen pathway    | `sharedCards`    |
| `pathway-multi`     | 1 per pathway (row-based stack, no rgl)   | n/a              |

`inter-scenario` / `inter-whatif` / `pathway-single` share a single
card list across columns — one row per card, mirrored across every
column. The leftmost column is the **origin** (only column with
editing affordances); the rest are read-only mirrors. `pathway-multi`
is the exception: it skips the column grid entirely and renders a
vertical stack of `<PathwayRow>`s (pathway name + Emission Pathway
plot per row), with no per-card editing surface.

Pathway modes are gated by the **Pathway View** toggle in the
`NavigatorCard` (visible only when the active scenario has ≥1
fully-baked pathway). The multi-select pathway picker (`<PathwayCompareSelect>`)
sits in the column-0 title row replacing the *Add Scenario to compare*
`+` button:
- 1 pathway picked  → `enterPathwaySingle(...)` → `pathway-single`
- ≥2 pathways picked → `enterPathwayMulti(...)`  → `pathway-multi`
- empty selection    → `startOver()`

Each `pathway-single` column is a `pathway-state` column carrying
`{ pathwayName, year, scenario: <child-state path> }`. The
`scenario` field is the child path under
`<parent>/outputs/pathways/<name>/state_<year>` so per-column data
fetches go through the existing scenario-scoped APIs. Column header
renders `Y_<year>` instead of the scenario name; the parent
scenario is shown once at the top via `<CanvasScenarioHeader>`.

## Key Patterns

### DO: Dispatch on `card.type` in `CanvasColumn`
```jsx
{card.type === 'kpi' ? (
  <FeatureCardKpi card={card} ... />
) : card.type === 'text' ? (
  <FeatureCardText card={card} columnIndex={columnIndex} ... />
) : card.type === 'divider' ? (
  <FeatureCardDivider card={card} columnIndex={columnIndex} ... />
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
const columnIndex = null; // Comparison modes share a single card list
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
`MAP_ANCHOR_W/H` constants are exported from `canvasStore.js` so the
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
`CanvasMap` defines `InlineLayerToggle` / `InlineExtrudeButton` /
`InlineResetCameraButton` / `InlineResetCompassButton` locally with
fully explicit inline styles. Reusing the main viewport's `MapControls`
left first-paint races where `Toolbar.css`'s 40×40 / 8 px-padded
defaults beat the Canvas Builder-scoped overrides and the icons would land in
the NW of the frame until a later layout pass settled. Inline styles
on a unique wrapper make the cascade irrelevant.

### DO: Initialise layer visibility + colour mode in `CanvasMap`
`useMapStore` is a singleton shared with the main viewport. When Canvas Builder
is the entry point, no other component has flipped layer visibility on
yet — so `CanvasMap` itself runs the first-load init (visibility = true
for every key in `data`, colour mode = CONSTRUCTION_STANDARD) on its
own first render. Skip these and the toolbar appears but the map stays
blank.

### DO: Always seed plots with a `plotConfig.script`
Every plot on the canvas has a script; `useFetchCustomPlot` is the only
path. The legacy `useFetchCanvasPlot` (feature-based) was removed
because no UI path could reach it. Adding a plot always opens
`PlotEditModal`, which never returns without a populated `plotConfig`.

### DO: Render Map cards with the same `<CanvasMap>` widget as the primary tile
```jsx
const FeatureCardMap = ({ card, ... }) => {
  const [store] = useState(() => createMapInstanceStore({ category, layer }));
  // ...register store under card.id so BottomCard can find it...
  return (
    <MapInstanceContext.Provider value={store}>
      <FeatureCardShell ...>
        <CanvasMap project={project} scenario={scenario} />
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
`mapInstance` store with two slices:
- **Layer-rendering** (always per-card): `category`,
  `selectedMapLayer`, `mapLayerParameters`, `mapLayers`,
  `mapLayerLegends`, `range`.
- **View-state** (per-card only when `mapsLinked === false`):
  `viewState`, `cameraOptions`, `extruded`, `visibility`,
  `mapLabels`, `colorMode`, `filters`.

Layer-rendering hooks read per-card whenever a provider is in scope.
View-state hooks honour the `Sync Maps` toggle on `canvasStore`:
`mapsLinked === true` → singleton (overview map drives all cards);
`mapsLinked === false` + provider → per-card. Outside any provider
(main viewport, primary overview tile) every scoped hook falls back
to the singleton.

### DO: Hide FeatureCardMap toolbars when `mapsLinked` is on
`CanvasMap` accepts `showToolbar` (default `true`). The primary
overview tile always renders the 4-button toolbar; FeatureCardMaps
pass `showToolbar={!mapsLinked && !exportMode}` so the toolbar
hides whenever sync is on or Export View is on.

### DO: Strip every editing affordance under `exportMode`
`canvasStore.exportMode` (driven by the Navigator's "Export View"
toggle) is the single switch that turns the canvas into a clean
snapshot surface. Each editing control reads it directly and renders
nothing when on:
- `FeatureCardShell` — Edit / Delete buttons; drops the
  `cea-card-drag-handle` class + grab cursor; suppresses the
  `editing` purple stroke.
- `CanvasColumn` — both `<PerimeterPlusButtons>` (primary tile +
  feature cards), the primary map's drag-grip strip, and
  `isDraggable` / `isResizable` on every layout item.
- `CanvasMap` — toolbar via `showToolbar` (gated by Export View).
- `Legend.ColourRampLegend` — range-mode `<Select>` row.
- `Legend.LegendFilterRow` — scale / radius numeric inputs (returns
  `null`). Gated via `useCanvasExportMode()` from `mapInstance`,
  which also requires a `MapInstanceContext` provider so the main
  viewport's `Legend` is unaffected.
- `FeatureCardPlot` — "Add a plot" pill.
- `PlotSlotCard` — per-plot Edit / Delete trio.
- `ComparisonView` / `CanvasColumn` — the column-add `+` buttons.

`CanvasPage` subscribes to the store and closes the plot drawer +
map-card bottom on the false → true transition so any open editing
surface vanishes the moment the toggle flips on.

### DO: Seed per-card view-state on the linked → unlinked transition
`FeatureCardMap` snapshots `useMapStore.getState()` for the
view-state keys and writes them into the per-card store the first
time `mapsLinked` flips from `true` to `false`. Each card therefore
keeps the overview map's current view as its starting point instead
of jumping to per-card defaults.

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
// CanvasPlot's `onNaturalHeight(heightPx)` callback, sums + chrome,
// reports upward as `onPreferredHeight(cardId, totalPx)`.
// CanvasColumn keeps a Map<cardId, lastReported> so it grows whenever
// a fresh report exceeds the previous, never on equal/smaller reports
// (so user-driven shrinks aren't undone by re-renders).
```
Sankey-style figures with backend-baked pixel heights drive the growth.
Charts without explicit `layout.height` report nothing and autosize
inside whatever the user has set.

### DO: Fit Plotly figures to their container on resize
```jsx
// CanvasPlot — ResizeObserver skips its first fire (initial mount),
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

### DO: Treat the leftmost compare column as the editing "origin"
```jsx
<CanvasColumn
  isOrigin={i === 0}                                 // shows the
                                                      // "Origin" badge
  lockedReadOnly={i !== 0}                            // strips Edit
                                                      // / Delete /
                                                      // perimeter `+`
                                                      // / map-bottom
  onCloseColumn={i !== 0 ? () => removeColumn(i) : undefined}
/>
```
The card list is *shared* across every comparison column — adding
or removing a card on the origin propagates to all mirrors via
`sharedCards`. Non-origin columns drop every editing affordance so
the user can't be confused about which column "owns" a card.
`onCloseColumn` renders an `×` in the title row that drops that
scenario / what-if from the comparison.

### DO: Persist Compare picks across "Stop comparing"
```js
// canvasStore
comparisonSetup:
  | { kind: 'inter-scenario',  scenarios }
  | { kind: 'inter-whatif',    parentScenario, whatifs }
  | { kind: 'pathway-single',  pathwayName, stateYears, parentScenario }
  | { kind: 'pathway-multi',   pathwayNames, parentScenario }
// Set by `enterInterScenario` / `enterInterWhatif` /
// `enterPathwaySingle` / `enterPathwayMulti`. Survives
// `stopCompareMode` (revert to launch); cleared by `startOver`. The
// CompareButton in the navigator uses this to decide between
// "Compare" (no setup) and "Resume comparing" (setup exists,
// view === 'launch').
```
Comparison setup lives on `canvas.yml` as `comparison_setup`,
decoupled from the active `view` field — the canvas opens in
whichever view it was last in, and the saved picks resume on
demand.

### DO: Gate the Pathway picker on the active scenario's *simulated* pathways
```jsx
const hasSimulatedPathway = useHasSimulatedPathway();
<CanvasColumn
  ...
  titleRowSlot={hasSimulatedPathway ? <PathwayCompareSelect /> : null}
/>
```
There is no toggle: the multi-select dropdown sits directly in the
column-0 title row whenever the active scenario has a pathway whose
every state has been *simulated*. Stricter than `OverviewCard`'s
pathway viewer (which gates on `all_baked`) — picking a pathway whose
states are merely baked but unsimulated would land the canvas in
columns with missing emission / demand outputs. Selection drives
the entry into pathway-single / pathway-multi (and back to launch
when cleared). `PathwayCompareSelect` itself fires a confirmation
modal when the user is mid-way through an inter-scenario /
inter-whatif compare and picks a pathway, because the column /
card layout is incompatible across modes.

### DO: Treat `pathway-single` columns as inter-scenario columns with state folders
```js
// enterPathwaySingle stores pathwayName + year on the column def.
// CanvasColumn reads parentScenario from the store and builds scenarioContext:
columns = years.map((year) => ({
  type: 'pathway-state',
  pathwayName,
  year,
  scenario: `${parent}/outputs/pathways/${pathwayName}/state_${year}`,
}));

// CanvasColumn → scenarioContext for FeatureCardPlot / CanvasPlot:
const scenarioContext =
  columnDef.type === 'pathway-state'
    ? { scenarioName: parentScenario, pathwayName: columnDef.pathwayName, year: columnDef.year }
    : { scenarioName: scenario };
```
Each `pathway-state` column passes `scenarioContext` (not a raw `scenario`
string) to `FeatureCardPlot` → `PlotSlotCard` → `CanvasPlot` →
`useFetchCustomPlot`. The hook sends `X-CEA-Scenario-Name` (parent) +
`X-CEA-Child-Scenario` (`pathwayName/year` token) in headers; the backend
resolves the child state via InputLocator. KPI / Map cards still use the
`columnDef.scenario` subpath directly. Only the column header label swaps
from the scenario name to `Y_<year>`.

### DO: Render pathway chrome through `ComparisonView`, not new pages
```jsx
// ComparisonView.jsx
if (view === 'pathway-multi') return <PathwayMultiView />;
return (
  <div>
    <CanvasScenarioHeader trailing={...} />
    {view === 'pathway-single' && <PathwayTimelineStrip />}
    <div style={columnsRowStyle}>...</div>
  </div>
);
```
`CanvasScenarioHeader` and `PathwayTimelineStrip` are pathway-only
chrome — they early-return `null` outside their target views, so
`ComparisonView` can render them unconditionally. The canvasStyle
is a flex column so they stack above the columns row (the
timeline card spans the full canvas width above every state-year
column). `pathway-multi` short-circuits the column grid entirely
because its row layout is incompatible with the rgl-based
comparison columns.

### DO: Open `MapLayerProperties` at the bottom for both Plot and Map flows
`CanvasPage` carries two parallel switches: `drawer` (plot-tool drawer
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
stops `CanvasPage`'s grid cell from stretching the canvas to full row
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
the main viewport's tool card. Canvas Builder overrides Run via
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
`CanvasPage` owns drawer state. Views call
`onOpenDrawer({ plotConfig, onSave })` with an `onSave` closure that
captures their local state, so the page doesn't need to know which
view owns what. The slot is only inserted when `onSave` fires (i.e.
the user clicks Run inside the drawer).

### DO: Align y-axes only when columns share a slot id
```jsx
const { handlePlotReady } = useYAxisAlignment(
  columns.length > 1,
  columns.length,
);
```

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
- `stores/canvasStore.js` - View state machine, card CRUD, default
  card / map-anchor constants.
- `hooks/useCanvasData.js` - React Query wrappers for `/api/reports/*`.
  `useFetchCustomPlot` takes `scenarioContext = { scenarioName, pathwayName?, year? }`;
  pathway-single uses `X-CEA-Child-Scenario` header, others use `X-CEA-Scenario-Name` only.
- `hooks/useYAxisAlignment.js` - Debounced Plotly y-axis unifier.
- `components/CanvasPage.jsx` - Top-level grid (nav + canvas + bottom
  + plot tool); owns drawer + map-bottom state.
- `components/NavigatorCard.jsx` - Top-bar navigator (Return, Start
  Over, mode label).
- `components/BottomCard.jsx` - Map-layer properties form, opened by
  Plot drawer or Map card.
- `components/LaunchView.jsx` - Single-column launch entry + 3 mode
  buttons; owns its own card list locally.
- `components/ComparisonView.jsx` - Multi-column layout with
  per-column dividers and the "+ column" button.
- `components/CanvasColumn.jsx` - Column shell — sticky title row,
  then `<GridLayout>` containing the primary map tile and the
  card-type-dispatched FeatureCard variants. Owns the menu data
  (`buildSectionMenus`) consumed by the perimeter `+` buttons.
- `components/PerimeterPlusButtons.jsx` - Perimeter `+` affordance
  + animated icon-panel expansion (Map / Plot / KPI sub-Dropdowns)
  + edge-exposure geometry helpers. Lives next to `CanvasColumn`
  but isolated from the grid logic.
- `components/PerimeterPlusButtons.css` - Expand/collapse keyframes
  for the icon-panel cascade.
- `components/CanvasMap.jsx` - Per-column map tile (shared scenario
  data via `useInputs`) with an inline-rendered toolbar.
- `components/featureCardCommon.jsx` - `FeatureCardShell` (shared
  chrome) + `findFamilyForFeature` + shared styles.
- `components/FeatureCardPlot.jsx` - Plot-only card; vertically-stacked
  `PlotSlotCard`s + "Add a plot" pill + natural-height aggregator.
- `components/FeatureCardKpi.jsx` - KPI-only card; one KPI strip per
  feature.
- `components/FeatureCardDivider.jsx` - Divider card; renders a black
  horizontal or vertical rule. Orientation / style / thickness live in
  a hover-revealed floating toolbar and are fanned out across columns
  via `setCardDividerConfig`.
- `components/FeatureCardMap.jsx` - Map-only card; mirrors the primary
  map widget for a chosen category + layer. Owns a per-card
  `mapInstance` store and publishes it in the registry.
- `components/mapInstance.js` - Per-card map state: store factory,
  scoped hooks (with singleton fallback), and the card-store
  registry consumed by `BottomCard`.
- `components/PlotSlotCard.jsx` - One plot's caption + Edit / Delete
  trio + the `<CanvasPlot>` itself.
- `components/CanvasPlot.jsx` - Fetches custom-plot HTML and runs
  the embedded Plotly scripts; lifts the chart title for the slot
  caption.
- `components/PlotEditModal.jsx` - Drawer card: PlotChoices picker
  → PlotTool parameter form.
- `components/CircleActionButton.jsx` - Shared blue-circle + label
  button (`sm` / `md`). Uses `CreateNewIcon` and the pathway palette.
- `components/PathwayCompareSelect.jsx` - Multi-select pathway
  picker that replaces the *Add Scenario to compare* `+` button
  whenever Pathway View is on. Reads baked pathways via
  `usePathwayOverview`; calls `enterPathwaySingle` /
  `enterPathwayMulti` on change; clearing selection runs
  `startOver`. Wears the same black-pill `cea-scenario-select`
  styling as `OverviewCard`'s pathway dropdown.
- `components/PathwayTimelineStrip.jsx` - Pathway Emission Timeline
  card spanning the full canvas width above the state-year columns
  in `pathway-single`. Wears the same chrome as `FeatureCardShell`
  (white surface, 1 px border, 12 px radius) but is positioned at
  the canvas level rather than inside a column's grid — one shared
  timeline across every column, not one per column. Uses
  `plot-pathway-emission-timeline` against the parent scenario.
- `components/PathwayMultiView.jsx` - Row-based multi-pathway view.
  Vertical stack of `<PathwayRow>`s, one per selected pathway, each
  rendering the pathway name + an Emission Pathway plot. Rows share
  a computed year range so the timescale aligns visually. Bypasses
  the column grid and `react-grid-layout` entirely.
- `components/CanvasScenarioHeader.jsx` - One-line scenario header
  rendered at the top of the canvas in pathway modes
  (`Scenario: <name> — Pathway View`). Optional `trailing` slot
  hosts the `<PathwayCompareSelect>` in `pathway-multi`. Hidden in
  non-pathway modes — `NavigatorCard` provides scenario context
  there.

## Icons & buttons
- Use icons from `assets/icons` (same set as pathway). Avoid
  `@ant-design/icons` — the only acceptable exceptions are
  `LeftOutlined` (no pathway equivalent for a back arrow),
  `LoadingOutlined` (pairs with antd `Spin`), and `CloseOutlined`
  (close button on `BottomCard`).
- Use `CircleActionButton` for any blue-circle + label control so new
  call sites stay visually consistent with `LaunchView`.

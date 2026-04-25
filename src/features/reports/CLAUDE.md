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

Each view owns a list of columns. Columns hold cards; cards hold plots.

```
Card { id, row, col, w, h, feature, plots: [{ id, plotConfig }] }
```

Card positions are sparse 2D grid coordinates in `react-grid-layout`
units (`COL_WIDTH_PX`/`ROW_HEIGHT_PX` in `ReportColumn`). The map is a
virtual tile at `(0, 0)` — feature cards never occupy that slot.

| View              | Columns                          | Card storage     |
|-------------------|----------------------------------|------------------|
| `launch`          | 1 (local)                        | `useState`       |
| `inter-scenario`  | 1 per sibling scenario           | `sharedCards`    |
| `inter-whatif`    | 1 per what-if under parent       | `sharedCards`    |
| `inter-feature`   | 1 per (scenario, feature) pair   | `columnCards[i]` |

## Key Patterns

### DO: Route card/plot actions through `columnIndex` (`null` for shared)
```jsx
const columnIndex = isFeatureMode ? i : null;
addCard(columnIndex, { targetCardId, direction, feature, plotConfig });
addPlot(columnIndex, cardId, plotConfig);
updatePlot(columnIndex, cardId, plotId, plotConfig);
removePlot(columnIndex, cardId, plotId); // drops the card if last plot
applyCardLayouts(columnIndex, updates); // batched drag/resize results
```
The store's `getCards(columnIndex)` / `setCards(columnIndex, next)`
helpers abstract shared-vs-per-column dispatch so each action body
doesn't branch on view mode.

### DO: Use `react-grid-layout` for tile placement, not CSS Grid
Every tile (map + feature cards) is a draggable, resizable child of
`<GridLayout>`. The library handles collision detection + vertical
auto-compaction, so cards push neighbours only when they would
actually overlap, never overlap each other, and unrelated cards stay
put. Position state (`{x, y, w, h}`) is persisted via
`onLayoutChange → onApplyLayouts(updates)`.

### DO: Pin map tile size with explicit `MAP_DEFAULT_W/H` units
The map's launch footprint is exactly 6×5 grid units, working out to
500×280 px at the configured `COL_WIDTH_PX` (70) / `ROW_HEIGHT_PX`
(40) / `GRID_MARGIN` ([16, 20]). The same `MAP_ANCHOR_W/H` constants
are exported from `reportsStore.js` so anchor logic in both
`LaunchView.insertCard` and the store's `insertCardInto` agree.

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
fully explicit inline styles. Reusing the main viewport's
`MapControls` component left first-paint races where `Toolbar.css`'s
40×40 / 8 px-padded defaults beat the Reports-scoped overrides and the
icons would land in the NW of the frame until a later layout pass
settled. Inline styles on a unique wrapper make the cascade
irrelevant.

### DO: Initialise layer visibility + colour mode in `ReportMap`
`useMapStore` is a singleton shared with the main viewport. When
Reports is the entry point, no other component has flipped layer
visibility on yet — so `ReportMap` itself runs the first-load init
(visibility = true for every key in `data`, colour mode =
CONSTRUCTION_STANDARD) on its own first render. Skip these and the
toolbar appears but the map stays blank.

### DO: Always seed plots with a `plotConfig.script`
Every plot on the canvas has a script; `useFetchCustomPlot` is the
only path. The legacy `useFetchReportPlot` (feature-based) was
removed because no UI path could reach it. Keep it that way — adding
a plot always opens `PlotEditModal`, which never returns without a
populated `plotConfig`.

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
The right/bottom padding is sized so the absolutely-positioned `+`
buttons hanging off the map's edges don't touch the canvas border.
`fit-content` stops `ReportsPage`'s grid cell from stretching the
canvas to full row height.

### DO: Reuse the main viewport's `<Tool>` for the plot form
```jsx
import Tool from 'features/tools/components/Tools/Tool';
import { PlotChoices, PlotTool } from 'features/project/components/Cards/plot-tool';

<PlotTool key={selectedScript} script={selectedScript} onRunOverride={...} />
```
`<Tool>` renders the same header, parameter list, and Run button as
the main viewport's tool card. Reports overrides Run via
`onRunOverride` — when present, `ToolFormButtons.runScript` calls it
with validated form values instead of creating a job, and the Save /
Reset buttons hide. Picker phase uses `<PlotChoices>` for visual
parity.

### DO: Drive the bottom card from the drawer's selected script
`PlotEditModal` keeps the shared `mapStore` selected layer in sync
with the plot being edited (via `scriptToMapLayer` →
`findCategoryForLayer`) so `MapLayerPropertiesCard` in the bottom
card renders the parameter form for that exact layer. Cleared on
drawer close.

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
the parameter form. With no quick-pick options, clicking falls back
to opening the full `<PlotChoices>` picker.

### DO: Derive quick-pick options from `PLOT_GROUPS`
`FeatureCard.findFamilyForFeature` walks `PLOT_GROUPS` to find the
group/subgroup that owns a card's `feature` key, then lists every
sibling key. Adding a new plot to an existing group surfaces it
automatically — no parallel feature→plots dictionary to maintain.

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
  + plot tool); owns drawer state.
- `components/NavigatorCard.jsx` - Top-bar navigator (Return, Start
  Over, mode label).
- `components/BottomCard.jsx` - Map-layer properties form; visible
  only while the drawer is open.
- `components/LaunchView.jsx` - Single-column launch entry + 3 mode
  buttons; owns its own card list locally.
- `components/ComparisonView.jsx` - Multi-column layout with
  per-column dividers and the "+ column" button.
- `components/ReportColumn.jsx` - Column shell — title row, then a
  `<GridLayout>` containing the map tile + one `FeatureCard` per
  card.
- `components/ReportMap.jsx` - Per-column map tile (shared scenario
  data via `useInputs`) with an inline-rendered toolbar.
- `components/FeatureCard.jsx` - Title + KPI strip + stacked
  `PlotSlotCard`s + an "Add a plot" pill.
- `components/PlotSlotCard.jsx` - One plot's caption + Edit/Reset/
  Delete trio + the `<ReportPlot>` itself.
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
  `LeftOutlined` (no pathway equivalent for a back arrow) and
  `LoadingOutlined` (pairs with antd `Spin`).
- Use `CircleActionButton` for any blue-circle + label control so new
  call sites stay visually consistent with `LaunchView`.

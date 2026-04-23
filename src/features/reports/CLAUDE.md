# Reports Feature

Side-by-side comparison dashboard. Three comparison modes, a Zustand store
for view/column/slot state, and Plotly-based charts with y-axis alignment
across shared-slot columns.

## Main API
- `useReportsStore()` - View/column/slot state and view transitions.
- `useFetchWhatifs(project, scenario) -> Query<string[]>` - What-if names
  under a scenario.
- `useFetchScenarios(project) -> Query<string[]>` - Sibling scenario names
  for a project.
- `useFetchFeatures(project, scenario) -> Query<Feature[]>` - Available
  plot features for the feature picker.
- `useFetchSummary(project, scenario, whatif?) -> Query<object>` - KPI
  strip payload for a column.
- `useFetchPlot(project, scenario, plotConfig, whatif?) -> Query<object>` -
  Plotly figure payload for a slot.
- `useFetchZoneGeojson(project, scenario) -> Query<object>` - Map
  thumbnail data.
- `useYAxisAlignment(enabled, numColumns)` - Post-render Plotly hook that
  unifies y-axis range across columns sharing the same slot id.
- `ReportsPage` - Top-level page; routes between `LaunchView` and
  `ComparisonView` based on `useReportsStore.view`.

## Views & columns

Cards are first-class in the store: each column owns a 2D grid of
feature cards, where each card owns its list of plots.

```
Card { id, row, col, feature, plots: [{ id, plotConfig }] }
```

| View              | Columns                              | Card storage   |
|-------------------|--------------------------------------|----------------|
| `launch`          | Single local-state column            | local `useState` |
| `inter-scenario`  | One per sibling scenario             | `sharedCards`  |
| `inter-whatif`    | One per what-if under parent         | `sharedCards`  |
| `inter-feature`   | One per (scenario, feature) pair     | `columnCards`  |

## Key Patterns
### DO: Route card/plot actions through `columnIndex` (null for shared)
```jsx
const columnIndex = isFeatureMode ? i : null;
addCard(columnIndex, { targetCardId, direction, feature, plotConfig });
addPlot(columnIndex, cardId, plotConfig);
updatePlot(columnIndex, cardId, plotId, plotConfig);
removePlot(columnIndex, cardId, plotId); // drops card if last plot
```
The store's `getCards(columnIndex)` / `setCards(columnIndex, next)`
helpers abstract the shared-vs-per-column dispatch, so each action
doesn't branch on view mode.

### DO: Render cards on a CSS Grid — `row`/`col` from card state
```jsx
<div
  style={{
    display: 'grid',
    gridTemplateRows: `repeat(${rows}, auto)`,
    gridTemplateColumns: `repeat(${cols}, minmax(280px, 1fr))`,
  }}
>
  {cards.map((card) => (
    <div key={card.id} style={{ gridRow: card.row + 1, gridColumn: card.col + 1 }}>
      <FeatureCard card={card} ... />
    </div>
  ))}
</div>
```
Empty columns render a single "fallback" `FeatureCard` at (0,0) with
no plots so the user sees the grid's intent and can add the first
plot — on Run, a real card is committed at (0,0).

### DO: Let + edges grow the grid southeast
```jsx
// FeatureCard renders a + on its right edge and its bottom edge.
onAddCardRight={() => onAddCard({ targetCardId: card.id, direction: 'right' })}
onAddCardBottom={() => onAddCard({ targetCardId: card.id, direction: 'bottom' })}
```
`addCard` shifts any existing card in the target row (for `'right'`)
or target column (for `'bottom'`) to open space. This keeps the
mental model "insert here" instead of "append somewhere".

### DO: Let the canvas fit its content — don't offer a resize handle
```jsx
// Canvas style in both LaunchView and ComparisonView.
const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  width: 'fit-content',
  // no fixed width, no drag handle, no ad-hoc useState for size.
};
```
The outer white "canvas" sizes to its content (title card, map,
feature cards). It grows as more feature cards or columns are added
and shrinks back when they're removed. No user-adjustable width — the
content is the source of truth.

### DO: Use CSS-native `resize: both` for cards inside the canvas
```jsx
const cardStyle = {
  ...,
  resize: 'both',
  overflow: 'hidden', // required — otherwise `resize` has no effect
  minWidth: 240,
  minHeight: 48,
};
```
The browser paints a small drag handle in the bottom-right corner of
each card and handles the drag itself — no React state, no global
pointer listeners, no custom ref plumbing. For cards whose content
does not reflow on container change (e.g. maplibre maps), install a
`ResizeObserver` inside the component and call its own `resize()` so
the inner canvas stays in sync with the outer card.

### DO: Put "Add a plot" inside the `FeatureCard` it belongs to
```jsx
// FeatureCard.jsx — single cea-template-select dropdown per feature.
<AddPlotSelect
  options={quickPickOptions}
  onPick={(script) => onAddPlot(script)}
  onFallback={() => onAddPlot()}
/>

// ReportColumn.jsx — bind the feature so the caller receives it.
onAddPlot={onAddPlot ? (script) => onAddPlot(feature, script) : undefined}
```
The new plot inherits the card's feature. To start a new feature in a
column, the user changes an existing plot's feature via the drawer —
it will migrate into a new card on next render. Column-level "Add a
plot" rows have been removed.

### DO: Reuse the main viewport's `Tool` component for the plot form
```jsx
import Tool from 'features/tools/components/Tools/Tool';
import { PlotChoices } from 'features/project/components/Cards/plot-tool';

<Tool
  script={selectedScript}
  form={form}
  onParametersLoaded={handleParametersLoaded}
  onRunOverride={handleRunOverride}
/>
```
`Tool` renders the exact same header, description, parameter list,
and Run button that appears in the main viewport's tool card. The
only Reports-specific wiring is `onRunOverride` — when present,
`ToolFormButtons.runScript` calls it with validated form values
instead of creating a job, and the Save Settings / Reset buttons are
hidden (they only make sense for the persistent-tool-params flow).
Picker phase uses `PlotChoices` imported from the main viewport for
the same reason: one source of truth, visual parity for free.

### DO: Use `cea-template-select` for the "Add a plot" dropdown
```jsx
// FeatureCard.jsx — mirrors pathway's TemplateSelect visually.
<Select
  className={`cea-template-select ${hasOptions ? '' : 'cea-template-select-empty'}`}
  placeholder="Add a Plot"
  options={quickPickOptions.map((o) => ({ label: o.label, value: o.script }))}
  onSelect={(script) => onPick(script)}
  onClick={hasOptions ? undefined : onFallback}
/>
```
Same black-outlined pill the pathway builder uses for Intervention
Templates. Picking a plot seeds the drawer with `{ script }` so the
parameter form opens directly. When the feature has no quick-pick
options, clicking the control falls back to `onAddPlot()` with no
script — which opens the full `PlotChoices` picker.

### DO: Derive the quick-pick list from `PLOT_GROUPS`, not a local list
```jsx
// FeatureCard.jsx
const FEATURE_ANCHOR = {
  demand: DEMAND,
  'final-energy': FINAL_ENERGY,
  costs: COST_BREAKDOWN,
  emissions: EMISSIONS_OPERATIONAL,
  'heat-rejection': ANTHROPOGENIC_HEAT,
};
// At render: find the PLOT_GROUPS group/subgroup that contains the
// anchor and list every key in it.
```
The dropdown options come from `PLOT_GROUPS` (the same structure the
main viewport's `PlotChoices` uses). Adding a new plot to an existing
group — say a new GHG Emissions plot under Life Cycle Analysis →
GHG Emissions — surfaces it in the Emissions card's dropdown with no
change here. Only a brand-new feature card (new family in Reports)
needs a new `FEATURE_ANCHOR` entry.

### DO: Stage plot slots — commit only when the user clicks Run
```jsx
// "Add a plot" opens PlotEditModal (right-side drawer) with an in-memory
// draft. The slot is inserted into the store ONLY when the user clicks
// Run, at which point it carries a full `plotConfig`.
const [drawerTarget, setDrawerTarget] = useState(null);
const handleAddPlot = (feature, columnIndex) =>
  setDrawerTarget({ mode: 'add', feature, columnIndex });
```
No slot ever exists without a `plotConfig`. This means `ReportPlot`
always uses the custom-plot path (`POST /api/reports/plot-custom`) and
the bare GET `/api/reports/plot` endpoint is never reached from the
Reports UI. Entering a comparison view creates empty columns; all
plots are added explicitly by the user.

### DO: Align y-axes only when columns share a slot id
```jsx
// Disable alignment in feature mode — each column has its own slot list.
const { handlePlotReady } = useYAxisAlignment(!isFeatureMode && columns.length > 1, columns.length);
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

### DO: Let LaunchView own its own slot list locally
```jsx
// Launch is a preview, not part of the comparison state machine.
const [launchSlots, setLaunchSlots] = useState([...]);
```
The launch view is a throwaway preview that resets the moment the user
enters a real comparison mode. Keeping its slots in the global store
would force a second source of truth for data the comparison views never
read.

### DO: Re-index `columnPlotSlots` when removing a column
```jsx
// columnPlotSlots is keyed by column index — keep the keys contiguous.
const newColumnPlotSlots = {};
Object.keys(columnPlotSlots).forEach((key) => {
  const k = Number(key);
  if (k < index) newColumnPlotSlots[k] = columnPlotSlots[k];
  else if (k > index) newColumnPlotSlots[k - 1] = columnPlotSlots[k];
});
```

### DO: Deduplicate columns on add
```jsx
// Different shapes for scenario/whatif/feature columns — check all three.
const isDuplicate = columns.some((c) => c.type === column.type && ...);
if (isDuplicate) return;
```

### DO: Seed feature-mode columns with a slot that matches the feature
```jsx
columnPlotSlots[newIndex] = [{ id: makeSlotId(), feature: column.feature, label: column.feature }];
```

### DO: Drive all header navigation through the navigation store
```jsx
const { push } = useNavigationStore();
push(routes.PROJECT); // Return to project page.
```

### DO: Guard API hooks with `enabled` flags
```jsx
useQuery({
  queryKey: ['reports', 'whatifs', project, scenario],
  enabled: Boolean(project && scenario),
  ...
});
```

### DO: Treat y-axis alignment as a side effect, not a data transform
```jsx
// Walk the DOM for `.js-plotly-plot` nodes AFTER render, read their
// rendered y-range, compute a shared range, and write it back via
// Plotly.relayout. Do not try to pre-compute aligned ranges in the data
// layer — the layout only converges after Plotly has sized the axes.
```

### DO: Follow the pathway colour palette
```jsx
// Primary blue: #1470AF  (action circles, primary buttons)
// Dark:        #000      (high-contrast solid selects)
// Accent:      #AC6080   (custom/alternative state)
// Neutral:     #CBD5E1   (inactive, default)
// Error:       #f04d5b   (validation errors)
// Info icon:   #94A3B8   (tooltips)
```

### DON'T: Ship disabled-but-visible buttons
```jsx
// Hide the control until the feature lands, or wrap a "Coming soon"
// tooltip. A perma-disabled button reads as "the feature is broken".
```

### DON'T: Persist LaunchView state into the reports store
Launch is a preview surface. Promoting its slots would mean two sources
of truth for slot config (the launch-only list and the comparison-view
lists), and the comparison views never read from launch state anyway.

## Related Files
- `stores/reportsStore.js` - View state machine, column & slot CRUD.
- `hooks/useReportsData.js` - React Query wrappers for `/api/reports/*`.
- `hooks/useYAxisAlignment.js` - Debounced Plotly y-axis unifier.
- `components/ReportsPage.jsx` - Top-level router (launch vs comparison).
- `components/TopToolbar.jsx` - Return / Start Over / Export.
- `components/LaunchView.jsx` - Single-column entry + 3 mode buttons.
- `components/ComparisonView.jsx` - Multi-column layout with dividers.
- `components/ReportColumn.jsx` - Column shell: header, map card, then one `FeatureCard` per feature present in `plotSlots`.
- `components/FeatureCard.jsx` - KPI section + vertically-stacked plots for a single feature.
- `components/PlotEditModal.jsx` - Slot configuration modal.
- `components/CircleActionButton.jsx` - Shared blue-circle + label button (`sm` / `md`). Uses `CreateNewIcon` and the pathway palette.

## Icons & buttons
- Use icons from `assets/icons` (same set as pathway). Avoid
  `@ant-design/icons` — the only acceptable exceptions are
  `LeftOutlined` (no pathway equivalent for a back arrow) and
  `LoadingOutlined` (pairs with antd `Spin`).
- Use `CircleActionButton` for any blue-circle + label control so new
  call sites stay visually consistent with `LaunchView`.

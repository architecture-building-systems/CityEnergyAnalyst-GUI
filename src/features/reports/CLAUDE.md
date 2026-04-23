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

| View              | Columns                              | Slot strategy    |
|-------------------|--------------------------------------|------------------|
| `launch`          | Single local-state column            | Local `useState` |
| `inter-scenario`  | One per sibling scenario             | `sharedPlotSlots`|
| `inter-whatif`    | One per what-if under parent         | `sharedPlotSlots`|
| `inter-feature`   | One per (scenario, feature) pair     | `columnPlotSlots`|

## Key Patterns
### DO: Pick the slot source by view mode, not by ad-hoc props
```jsx
const isFeatureMode = view === 'inter-feature';
const slots = isFeatureMode ? columnPlotSlots[index] : sharedPlotSlots;
```

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
- `components/ReportColumn.jsx` - Leaf column: map, header, KPIs, slots.
- `components/PlotEditModal.jsx` - Slot configuration modal.
- `components/CircleActionButton.jsx` - Shared blue-circle + label button (`sm` / `md`). Uses `CreateNewIcon` and the pathway palette.

## Icons & buttons
- Use icons from `assets/icons` (same set as pathway). Avoid
  `@ant-design/icons` — the only acceptable exceptions are
  `LeftOutlined` (no pathway equivalent for a back arrow) and
  `LoadingOutlined` (pairs with antd `Spin`).
- Use `CircleActionButton` for any blue-circle + label control so new
  call sites stay visually consistent with `LaunchView` and
  `AddPlotButton`.

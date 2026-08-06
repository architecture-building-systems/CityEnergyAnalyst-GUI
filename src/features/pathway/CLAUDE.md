# Pathway Feature

## Main API
- `fetchPathwayOverview() -> Promise<object>` - Shared span and year lanes for all pathways.
- `fetchPathwayTimeline(pathwayName) -> Promise<object>` - Active-pathway detail rows with status and YAML preview.
- `fetchYearEditorOptions(pathwayName, year) -> Promise<object>` - Choices for building/template editors.
- `createPathway(pathwayName, scenarioContext?) -> Promise<object>`, `deletePathway(pathwayName, scenarioContext?)`, `duplicatePathway(pathwayName, newName, scenarioContext?)`, `deletePathwayYear(pathwayName, year, scenarioContext?)`, `saveYearYaml(pathwayName, year, rawYaml, scenarioContext?)`, `applyTemplatesToYear(pathwayName, year, templateNames, scenarioContext?)` - Direct REST mutations, no job involved. `scenarioContext` mirrors `jobsStore.createJob`'s — pass `{ project, scenarioName, childScenario: null }` explicitly when the caller must pin the parent scenario (see the DO block below); omitted, it falls back to `activeScenarioHeaders()`.
- `usePathwayOverview({ enabled? })` - React Query hook keyed on the active scenario; cached, shared across consumers (currently the Canvas Builder's `NavigatorCard` toggle gating + `PathwayCompareSelect` options).
- `useHasSimulatedPathway()` - Boolean derivative — `true` iff the active scenario has at least one pathway whose every state has been simulated. Stricter than the baked-only predicate `OverviewCard`'s viewer uses; gates the Canvas Builder's Pathway picker so it only appears in scenarios where every column will actually have data to render.
- `PathwayPanel({ expanded, onExpandedChange, ... })` - Bottom-panel stacked timeline with shared ruler, inspector, editor modals, and full-screen toggle.

## Key Patterns
### DO: Treat overview and active timeline as separate queries
```jsx
const overview = await fetchPathwayOverview();
const timeline = await fetchPathwayTimeline(selectedPathway);
```

### DO: Keep the active pathway coloured and inactive lanes lightweight
```jsx
const laneYears = active ? activeRows.map((row) => row.year) : pathway.years;
```

### DO: Keep node hover bright and summary-first
```jsx
<Tooltip {...TIMELINE_TOOLTIP_PROPS} title={renderNodeTooltip(...)} />
// Keep YAML in the inspector or drawer, not in the hover card.
```

### DO: Keep `Add state` in the panel header, not inside one selected year
```jsx
<InputNumber value={newYearValue} />
<Button onClick={handleAddYear}>Add state</Button>
```

### DO: Launch a first-edit chooser for new years instead of creating empty placeholders
```jsx
setEditorTargetYear(year);
setCreateYearModalOpen(true);
// The year is only persisted after the first save.
```

### DO: Remember the selected year per pathway and only switch lanes explicitly
```jsx
selectedYearByPathwayRef.current[pathwayName] = year;
// Click to switch lanes directly. Avoid hidden wheel shortcuts for pathway changes.
```

### DO: Call the pathways REST API directly for fast mutations, not the job store
```jsx
await runPathwayAction({
  busyKey: 'delete-year',
  action: () =>
    deletePathwayYear(selectedPathway, selectedRow.year, {
      project, scenarioName, childScenario: null,
    }),
  refresh: () => refreshPathwayData({ preferredPathway: selectedPathway, preferredYear: selectedRow.year }),
  failureMessage: 'Failed to delete state.',
});
```
Decision rule: if the underlying `pathway_timeline.py` core function is just a
filesystem/YAML write (create/delete a pathway, delete/save-yaml/apply-templates
a year), call the REST route directly (`pathway/api.js`) via `runPathwayAction` —
no job, no status-bar entry, no `scenario` parameter to compute (the backend
resolves scenario from `X-CEA-*` headers on every route, not just job creation).
Keep the job store only for work that's genuinely slow / proportional to
scenario size (bake, simulate — see below).

`runPathwayAction`, unlike `startPanelJob`, does **not** pin the scenario
context for you — pass `{ project, scenarioName, childScenario: null }`
explicitly to the `pathway/api.js` call inside `action`, every time. Pathway
mutations always target the *parent* scenario's `outputs/pathways/...` tree
regardless of which pathway child state is active in the map/canvas; omitting
the context falls back to `activeScenarioHeaders()`, which follows whatever
child scenario happens to be active and would point the request at the wrong
folder.

### DO: Surface REST pathway-action feedback through the panel's own alert, not a toast
```jsx
try {
  await deletePathway(pathwayName, scenarioContext);
  await refreshPathwayData(...);
} catch (error) {
  setPanelError(getErrorMessage(error, 'Failed to delete the pathway.'));
}
```
Direct REST pathway actions have no status-bar job entry to fall back on, but
they also don't need a toast — the panel's persistent `panelError` `<Alert>`
is the established error surface (see `handleDeleteTemplate`, the original
non-job pathway action), and a successful data refresh is the success signal.
Components with no such alert (e.g. `OverviewCard`) use `message.error` on
failure instead, but stay silent on success — don't introduce a new toast
convention piecemeal.

### DO: Treat backend job names as domain actions, not UI labels
```jsx
'bake-pathway-states'
'pathway-simulations'
```

### DO: Keep bake/simulate on the job store — they're genuinely slow
```jsx
await startPanelJob({
  script: 'bake-pathway-states',
  parameters: { existing_pathway_name: pathwayName },
  busyKey: `bake-${pathwayName}`,
  startingMessage: 'Baking pathway states — this can take a while. Track progress in Job Info.',
  ...
});
```
`bake-pathway-states` rebuilds a full scenario-inputs copy per state year
(`shutil.copytree` + building-property regeneration) — cost proportional to
`years × scenario size`. `pathway-simulations` is slower still. Both stay on
the job system so the button spinner (`busyAction`, kept alive by
`pendingPanelJob` until real completion) and the status-bar Job Info panel
give real progress feedback instead of blocking an HTTP request. Pass
`startingMessage` to fire an immediate `message.info` toast the moment the
job is *created* — a clear "this started a background job" signal distinct
from the spinner, for the one action left on this path.

### DO: Keep header-level pathway workflow buttons together
```jsx
Validate all states | Bake states | Simulate pathway
```

### DO: Keep create/delete-pathway links in the header, but route deletion through a confirmation modal
```jsx
<Link onClick={handleDeleteSelectedPathway}>
  <DeleteOutlined /> Delete current pathway
</Link>
```

### DO: Track a started job through to real completion, not just creation
```jsx
setPendingPanelJob({ id: job.id, preferredPathway, preferredYear, failureMessage });
// busyAction stays set until the pendingPanelJob effect sees job.state
// resolve (success or failure) -- not just until the job is created.
```

### DO: Cap the visible lane stack and let it scroll independently when many pathways exist
```jsx
const timelineViewportHeight = Math.min(totalTimelineHeight, ...);
<div ref={laneStackScrollRef} style={{ maxHeight: timelineViewportHeight, overflowY: 'auto' }} />
```

### DO: Give the whole panel body a fallback scroll path when the user drags the panel shorter
```jsx
<div style={{ minHeight: 0, flex: 1, overflowY: 'auto' }}>
  ...
</div>
```

### DO: Keep the selected-state action buttons directly below the year summary
```jsx
<Title level={4}>{selectedRow.year}</Title>
<Text>{selectedRow.summary?.text}</Text>
<div>Building events | Apply templates | Validate state | Delete state</div>
```

### DO: Let the main YAML preview grow with the panel and use outer-panel scrolling
```jsx
<YamlPreview scrollable={false} minHeight={180} />
// Avoid tiny nested scrollbars in the main inspector layout.
```

### DO: Use editor modals for user-facing changes and keep YAML edit as expert mode
```jsx
setBuildingEventsModalOpen(true);
setYamlDrawerOpen(true);
```

### DO: Seed the YAML drawer from editor options, not only the currently rendered row
```jsx
const data = await ensureEditorOptions(selectedPathway, year);
setYamlDraft(data?.yaml_preview ?? DEFAULT_YAML_DRAFT);
```

### DO: Keep the drawer preview live and colourised while edit mode is on
```jsx
<YamlPreview value={yamlDraft} fill />
<Button onClick={() => setYamlEditEnabled((current) => !current)}>
  {yamlEditEnabled ? 'Preview only' : 'Enable editing'}
</Button>
```

### DO: Support tab indentation in the lightweight YAML editor
```jsx
onKeyDown={(event) => handleYamlTextareaKeyDown(event, yamlDraft, setYamlDraft)}
```

### DON'T: Persist or expect a `manual_state` flag in API payloads
```jsx
// State kind comes from `state_kind` and the row content itself.
```

### DO: Always send scenario headers in every `api.js` call
The pathway router applies `_apply_parent_scenario` globally (a
`CEAScenario` dependency on every route), so every request needs
`X-CEA-Project` + `X-CEA-Scenario-Name` headers. Omitting them causes
the backend to fall back to server-side config, which may not reflect
the user's active scenario.
```js
const { data } = await apiClient.post(url, body, {
  headers: activeScenarioHeaders(),
});
```
The mutation functions (`createPathway`, `deletePathway`, `duplicatePathway`,
`deletePathwayYear`, `saveYearYaml`, `applyTemplatesToYear`) route through
`resolveHeaders(scenarioContext)` instead — `activeScenarioHeaders()` when no
override is given, `scenarioHeaders(scenarioContext)` when a caller needs to
pin the parent scenario explicitly (see the REST-mutation DO block above).
Either way headers are always sent; never call these routes with none.

### DON'T: Call a `/pathways/...` route with a raw `apiClient` call outside `api.js`
`DuplicatePathwayModal` used to `apiClient.post` the duplicate route directly
from the modal component, with no headers at all -- a 400 from the backend's
`CEAScenario` dependency demanding `X-CEA-Project`/`X-CEA-Scenario-Name`.
Every `/pathways/...` call must go through a function in `api.js` (add one if
missing) so it always resolves headers via `resolveHeaders`/`activeScenarioHeaders`;
never reach for `apiClient`/`getScenarioClient` directly from a component.

Exception: `fetchStateFolderPath` passes `project`/`scenarioName` via
`scenarioHeaders()` instead of `activeScenarioHeaders()`, since it may be
called before a scenario is active; only `pathway_name` and `year` go in
the query params (the backend's `/project/state-folder` route resolves
project/scenario from headers via the `CEAScenario` dependency, same as
every other route).

## Related Files
- `api.js` - Dedicated pathway API client helpers. Every call uses
  `activeScenarioHeaders()` by default; the mutation functions
  (`createPathway`, `deletePathway`, `duplicatePathway`, `deletePathwayYear`,
  `saveYearYaml`, `applyTemplatesToYear`) accept an optional `scenarioContext`
  override for parent-pinning (see the REST-mutation DO block above);
  `fetchStateFolderPath` always uses `scenarioHeaders()` directly instead.
- `hooks/usePathwayOverview.js` - React Query wrapper around `fetchPathwayOverview` plus the `useHasSimulatedPathway` boolean derivative.
- `components/PathwayPanel.jsx` - Stacked-lane panel, shared ruler, inspector, and editor workflows.
- `../project/components/ProjectOverlay.jsx` - Bottom-panel mounting point and transition sizing.

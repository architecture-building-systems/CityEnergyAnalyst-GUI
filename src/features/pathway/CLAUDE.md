# Pathway Feature

## Main API
- `fetchPathwayOverview() -> Promise<object>` - Shared span and year lanes for all pathways.
- `fetchPathwayTimeline(pathwayName) -> Promise<object>` - Active-pathway detail rows with status and YAML preview.
- `fetchYearEditorOptions(pathwayName, year) -> Promise<object>` - Choices for building/template editors.
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

### DO: Launch panel mutations through the native job store
```jsx
await createJob('pathway-delete-state', {
  scenario,
  existing_pathway_name: selectedPathway,
  year_of_state: selectedRow.year,
});
```

### DO: Let native Job Info own success and failure feedback for pathway jobs
```jsx
await startPanelJob({ script: 'pathway-delete-pathway', ... });
setPanelError(null);
// Do not stack local toast popups on top of the status-bar job notifications.
```

### DO: Treat backend job names as domain actions, not UI labels
```jsx
'pathway-delete-state'
'pathway-validate-all-states'
```

### DO: Launch bake/simulate through the job store, not bespoke API routes
```jsx
await createJob('bake-pathway-states', {
  scenario,
  existing_pathway_name: selectedPathway,
});
```

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

### DO: Keep editors open until the started job finishes
```jsx
setPendingPanelJob({ id: job.id, onSuccess: 'saved-yaml' });
// Close the drawer on success, keep the draft open on job failure.
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

## Related Files
- `api.js` - Dedicated pathway API client helpers.
- `hooks/usePathwayOverview.js` - React Query wrapper around `fetchPathwayOverview` plus the `useHasSimulatedPathway` boolean derivative.
- `components/PathwayPanel.jsx` - Stacked-lane panel, shared ruler, inspector, and editor workflows.
- `../project/components/ProjectOverlay.jsx` - Bottom-panel mounting point and transition sizing.

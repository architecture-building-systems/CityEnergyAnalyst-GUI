# Pathway Feature

## Main API
- `fetchPathwayOverview() -> Promise<object>` - Shared span and year lanes for all pathways.
- `fetchPathwayTimeline(pathwayName) -> Promise<object>` - Active-pathway detail rows with status and YAML preview.
- `fetchYearEditorOptions(pathwayName, year) -> Promise<object>` - Choices for building/template editors.
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
// Click to switch lanes. Shift + wheel is the only scroll shortcut.
```

### DO: Launch panel mutations through the native job store
```jsx
await createJob('pathway-delete-state', {
  scenario,
  existing_pathway_name: selectedPathway,
  year_of_state: selectedRow.year,
});
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

### DO: Keep editors open until the started job finishes
```jsx
setPendingPanelJob({ id: job.id, onSuccess: 'saved-yaml' });
// Close the drawer on success, keep the draft open on job failure.
```

### DO: Use editor modals for user-facing changes and keep YAML edit as expert mode
```jsx
setBuildingEventsModalOpen(true);
setYamlDrawerOpen(true);
```

### DON'T: Persist or expect a `manual_state` flag in API payloads
```jsx
// State kind comes from `state_kind` and the row content itself.
```

## Related Files
- `api.js` - Dedicated pathway API client helpers.
- `components/PathwayPanel.jsx` - Stacked-lane panel, shared ruler, inspector, and editor workflows.
- `../project/components/ProjectOverlay.jsx` - Bottom-panel mounting point and transition sizing.

# Pathway Feature

## Main API

- `fetchPathwayOverview() -> Promise<object>` - Shared span and year lanes for all pathways.
- `fetchPathwayTimeline(pathwayName) -> Promise<object>` - Active-pathway detail rows with status and YAML preview.
- `fetchYearEditorOptions(pathwayName, year) -> Promise<object>` - Choices for building/template editors.
- `createPathway(pathwayName, scenarioContext?) -> Promise<object>`, `deletePathway(pathwayName, scenarioContext?)`, `duplicatePathway(pathwayName, newName, scenarioContext?)`, `deletePathwayYear(pathwayName, year, scenarioContext?)`, `saveYearYaml(pathwayName, year, rawYaml, scenarioContext?)`, `applyTemplatesToYear(pathwayName, year, templateNames, scenarioContext?)` - Direct REST mutations, no job involved. `scenarioContext` mirrors `jobsStore.createJob`'s — pass `{ project, scenarioName, childScenario: null }` explicitly when the caller must pin the parent scenario (see Key Patterns below); omitted, it falls back to `activeScenarioHeaders()`.
- `usePathwayOverview({ enabled? })` - React Query hook keyed on the active scenario; cached, shared across consumers (currently `OverviewCard`, `PathwayCompareSelect`, `PathwayMultiView`, `LaunchView`, and `ComparisonView`).
- `useHasSimulatedPathway()` - Boolean derivative — `true` iff the active scenario has at least one pathway whose every state has been simulated. Stricter than the baked-only predicate `OverviewCard`'s viewer uses; gates the Canvas Builder's Pathway picker so it only appears in scenarios where every column will actually have data to render.
- `PathwayPanel({ expanded, onExpandedChange, ... })` - Bottom-panel stacked timeline with shared ruler, inspector, editor modals, and full-screen toggle.

### Fast REST mutation vs. job store — decision rule

If the backend op is just a filesystem/YAML write (create/delete a pathway,
delete/save-yaml/apply-templates a year), call the REST route directly via
`runPathwayAction`, not the job store — no job, no status-bar entry. Keep the
job store (`startPanelJob`) only for `bake-pathway-states`/`pathway-simulations`,
whose cost scales with `years × scenario size`. Full rationale is commented
at the `startPanelJob`/`runPathwayAction` definitions in `PathwayPanel.jsx`.

`runPathwayAction`, unlike `startPanelJob`, does **not** pin scenario headers
for you — every `action` must pass `{ project, scenarioName, childScenario:
null }` explicitly to the `api.js` call it wraps. Pathway mutations always
target the _parent_ scenario's `outputs/pathways/...` tree regardless of which
child pathway state is active in the map/canvas; omitting the context falls
back to `activeScenarioHeaders()`, which follows the active child scenario
and points the request at the wrong folder.

### Scenario headers are mandatory on every `/pathways/...` call

The pathway router requires `X-CEA-Project`/`X-CEA-Scenario-Name` on every
route (`_apply_parent_scenario`); omitting them falls back to server-side
config, not the user's active scenario. Every `/pathways/...` call must go
through a function in `api.js` — never `apiClient`/`getScenarioClient`
directly from a component (a bug once shipped this way with no headers at
all). See the warning comment at the top of `api.js`, and the exception
comment on `fetchStateFolderPath` (called before a scenario may be active).

## Related Files

- `api.js` - Dedicated pathway API client helpers. Every call uses
  `activeScenarioHeaders()` by default; the mutation functions
  (`createPathway`, `deletePathway`, `duplicatePathway`, `deletePathwayYear`,
  `saveYearYaml`, `applyTemplatesToYear`) plus the read-only
  `fetchYearEditorOptions` accept an optional `scenarioContext` override for
  parent-pinning (see the decision-rule block above and `handleCopyState`,
  which pins it so copying a state always reads the parent's own YAML for
  that year rather than whatever child pathway state happens to be active
  elsewhere); `fetchStateFolderPath` always uses `scenarioHeaders()` directly
  instead.
- `hooks/usePathwayOverview.js` - React Query wrapper around `fetchPathwayOverview` plus the `useHasSimulatedPathway` boolean derivative.
- `hooks/usePathwayPanelResize.js` - Drag-to-resize + expand/collapse state for the bottom panel; consumed by `ProjectOverlay.jsx`.
- `components/PathwayPanel.jsx` - Stacked-lane panel, shared ruler, inspector, and editor workflows.
- `../project/components/ProjectOverlay.jsx` - Bottom-panel mounting point and transition sizing.

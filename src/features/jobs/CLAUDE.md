# Jobs Feature

## Main API

- `useCreateJob()` - Returns `createJob(script, parameters, scenarioContext?)`. POSTs to `/server/jobs/new`, then starts the job.
- `useJobsStore` - `jobs`, `fetchJobs`, `fetchMoreJobs`, `startJob`, `hasMore`/`nextOffset` for pagination.
- `JobInfoList` / `JobInfoCard` / `JobInfoModal` - Status-bar job list and detail views.
- `RecentJobsModal` - Opened by clicking the status badge stack (`cea-job-info-list-summary`) in `JobInfoList`. Lists every job currently in the store with client-side status filter tabs (all/in progress/completed/failed) and a "Load more" button (shown while `hasMore`) that calls `fetchMoreJobs()` on click only -- no auto-fetch on open or on scroll. Clicking a row opens `JobInfoModal` on top via the unchanged `JobInfoCard`.

## Key Patterns

### DO: Never compute a `scenario` job parameter client-side

```jsx
// jobsStore.js
createJob: async (script, parameters, scenarioContext) => {
  ...
  headers: scenarioContext ? scenarioHeaders(scenarioContext) : activeScenarioHeaders(),
```

The backend resolves `scenario` itself from the request's `X-CEA-*`
headers and overrides whatever the client sent it with — a client-supplied
value is discarded. Don't build one (string concatenation,
`buildScenarioPath`-style helpers, etc.) and don't pass one — it's dead
weight at best, misleading at worst. This is why Tool Form's
`getFormValues` doesn't send `scenario` either: the headers are enough,
and the backend fills it in.

### DO: Pass an explicit `scenarioContext` when a job must target something other than the active scenario

```jsx
// PathwayPanel.jsx / OverviewCard.jsx
await createJob(
  script,
  parameters, // no `scenario` key
  { project, scenarioName, childScenario: null },
);
```

`createJob`'s default (`activeScenarioHeaders()`) follows the store's
currently-active scenario, including whichever pathway child state
(`X-CEA-Child-Scenario`) is active in the map/canvas. Pathway mutation jobs
(`create-new-pathway`, `bake-pathway-states`, `pathway-delete-pathway`,
`pathway-delete-state`, ...) always operate on the _parent_ scenario's
`outputs/pathways/...` tree, so they pin `childScenario: null` explicitly
rather than letting a stray active child state redirect the job to the
wrong folder — see `features/pathway/CLAUDE.md`.

### DON'T: Treat a job's `parameters.scenario` as authoritative for anything read back from the client

The value the client puts in `parameters.scenario` before `POST
/server/jobs/new` is advisory at best (the backend overrides it) — never
read it back out of a saved job/plot config expecting it to reflect the
scenario the job actually ran against. Use the request's scenario context
(`{ project, scenarioName, childScenario }`) as the source of truth instead.

## Related Files

- `stores/jobsStore.js` - `createJob`, `startJob`, `fetchJobs`/`fetchMoreJobs` pagination.
- `components/Jobs/JobInfoList.jsx` - Status-bar job list; badge stack opens `RecentJobsModal`.
- `components/Jobs/RecentJobsModal.jsx` - "Recent jobs" list modal with status filter tabs and a manual "Load more" button (`fetchMoreJobs`/`hasMore`).
- `components/Jobs/JobInfoCard.jsx` / `LazyJobInfoCard.jsx` - Per-job detail card, lazily mounted.
- `components/Jobs/JobInfoModal.jsx` - Full job detail (stdout/stderr) modal.

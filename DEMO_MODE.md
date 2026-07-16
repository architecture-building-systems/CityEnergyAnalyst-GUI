# Demo mode: viewing public demo scenarios without a session

## Context

`UserCheckGate` used to redirect any anonymous/expired session (401 on
`/api/user`) straight to the project page — but with no `userID`,
`useInitProjectStore` never ran, so anonymous visitors saw an empty project
page. The backend already ships a public, anonymous, read-only demo sub-app
(`cea/interfaces/dashboard/api/demo.py`) mounted at `/api/demo` when
`public_demo_scenarios` is configured. This work wires the frontend up to it:
when there's no valid session, the app now auto-loads a demo scenario list
and renders the project page read-only against one.

Along the way, fixing the root cause of the original bug also mattered: an
unauthenticated `/api/user` response was previously treated as a React Query
*error*, which (combined with default retry/refetch behaviour) caused an
infinite mount/unmount loop. That's now modeled as valid data
(`userInfo === null`) instead of an error — see "Prerequisite fix" below.

## Prerequisite fix: `userInfo === null` instead of `isError`

- `src/stores/useUserQuery.js` — `fetchUser` catches a 401 specifically and
  resolves `null` (a valid "no session" state) rather than throwing. Any
  other status still throws, so genuine failures (network down, 5xx) keep
  going through the real `isError`/retry path.
- `src/app/UserCheckGate.jsx` — redirects to `routes.PROJECT` on
  `userInfo === null || isError`, `return`s immediately so stale/cached
  `userInfo` from a prior session can't drive a second, conflicting
  `push()` in the same effect run.

This was necessary groundwork: TanStack Query only skips its "never had
data" refetch-on-mount behavior once `data` is a real, non-`undefined`
value. Modeling "no session" as a thrown error left `data` `undefined`
forever, so every new component that mounted a `useUserQuery()` observer
(there are several) re-triggered a fetch — a self-sustaining loop.

## Demo mode design

### New files

- **`src/stores/demoStore.js`** — Zustand store: `demoMode`, `demoId`,
  `demoScenarios`, plus `enterDemo(scenarios)` / `setDemoId(id)` /
  `exitDemo()` and a `useDemoMode()` selector. Deliberately has **no axios
  import** — `lib/api/axios.js` reads from this store, so importing axios
  here would create a circular import.
- **`src/lib/api/scenarioContextHeaders.js`** — the three `X-CEA-*` header
  name constants; the canonical source for them (`scenarioContext.js` now
  imports from here rather than re-exporting them). Split out for the same
  circular-import reason: `scenarioContext.js` imports `useProjectStore`,
  which imports `apiClient` from `axios.js` — so `axios.js` importing from
  `scenarioContext.js` directly would also cycle.
- **`src/components/DemoBanner.jsx`** — small read-only notice shown on the
  project page in demo mode (plus an empty-state variant when no demo
  scenarios are configured).

### Request routing — `src/lib/api/axios.js`

- **`demoClient`** — a separate axios instance with a request interceptor
  that rewrites `/api/{rest}` → `/api/demo/scenarios/{demoId}/{rest}` and
  strips the `X-CEA-*` headers (the demo sub-app resolves scenario context
  from the URL path, not headers). No auth/refresh interceptor — demo
  requests are anonymous.
- **`getScenarioClient()`** — returns `demoClient` when `demoMode` is on,
  else `apiClient`. Existing hooks swap this in for `apiClient` and need no
  other changes, since the URL they build is unchanged (the interceptor
  does the rewriting).

### Entering / leaving demo mode — `src/app/UserCheckGate.jsx`

`useInitDemoStore(userInfo)`:
- `userInfo === null` → fetches `GET /api/demo/scenarios` (via the plain
  `publicClient`, no demo rewriting needed for that one bootstrap call),
  then `enterDemo(scenarios)` and seeds `projectStore` with a synthetic
  `project` token + the first scenario, so `Project.jsx` renders its normal
  (scenario-loaded) view instead of the empty-project state.
- A real session appearing later (login) → `exitDemo()` +
  `clearDemoProject()`, so `useInitProjectStore`'s normal
  localStorage-driven flow starts from a clean slate instead of a stale demo
  project.
- Reads zustand actions via `getState()` inside the effect rather than
  subscribing via selectors, so the effect depends on `userInfo` alone —
  otherwise `enterDemo` flipping `demoMode` would re-trigger the same effect
  and re-fetch the scenario list forever (the same class of bug as the
  original loop).
- Electron never enters demo mode (it manages its own local project
  storage).

### Data layer routed through `getScenarioClient()`

| Feature | Files |
|---|---|
| Inputs | `useInputs.js`, `useSchedules.js` |
| Map layers | `map-layers.js` (generate), `MapLayersCard/store.jsx` (catalogue), `Choice.jsx` / `Slider.jsx` (choices/range parameter selectors) |
| Canvas | `canvas/api/canvas.js` (`listSavedCanvases`, `readSavedCanvas` — reads only; writes stay on `apiClient`), `useCanvasData.js` (`useFetchWhatifs`, `useFetchFeatures`, `useFetchSummary`, `useFetchCustomPlot`) |
| Tools | `useToolList.js` (catalogue), `useToolParams.js` + `useCanvasData.js`'s `useFetchToolParams` (per-tool parameter schema) |
| KPIs | `useFetchKpis.js` (`useFetchKpiValue`, `useFetchKpiParameters`, `useFetchKpiSparkline`, `useFetchKpiRegistry`) |

Each of these followed a backend change that opened the corresponding demo
route up (see "Backend changes" below) — none were routed speculatively
ahead of the backend actually exposing them.

### UI gating

- **`ScenarioRow.jsx`** — demo mode renders `DemoScenarioSelect` instead of
  the normal scenario `<Select>`. It only calls
  `useDemoStore.setDemoId()` + `projectStore.updateScenario()` — no
  `PUT /api/project/*` (there is no session to attach that write to).
  Duplicate/New-scenario/Upload-Download icons already hide themselves via
  the existing `useIsValidUser()` gate (false when `userInfo === null`), no
  change needed there.
- **`BottomToolButtons.jsx`** — Database Editor and Pathway Builder are
  hidden in demo mode (not mounted in the demo API at all). Input Editor,
  Canvas Builder stay visible.
- **`ProjectOverlay.jsx`** — shows `DemoBanner` in the left sidebar, hides
  `JobInfoList` (jobs can never fetch in demo — gated on `isValidUser` — so
  hiding avoids a permanently-empty panel).

## Backend changes made during this work (for reference)

All in `cea/interfaces/dashboard/api/demo.py`, in the sibling
`CityEnergyAnalyst` repo:

1. Fixed a segment-name bug: the map-layers demo mount used `map-layers`
   (hyphen) while the real API is `map_layers` (underscore) — renamed to
   match.
2. Mounted the `tools` router: first GET-catalogue-only (`/` for the tool
   list), then widened to all GET routes (`/{tool_name}` for a tool's
   parameter schema too). Write routes (`save-config`, `validate-field`,
   `parameter-metadata`, `check` — all POST) remain excluded.
3. `reports` mount is **still GET-only** — `POST /api/reports/plot-custom`
   (the only path Canvas Builder plots render through) is **not yet
   exposed**. Frontend-side, `useFetchCustomPlot` etc. were already routed
   through `getScenarioClient()` on the assumption this would be opened up
   to mirror the `map_layers` GET+POST pattern — canvas plots won't
   actually render in demo until that lands.
4. Mounted the `kpis` router (all GET routes: `/registry`, `/`,
   `/{kpi_id}/parameters`, `/{kpi_id}/value` — no write routes exist for
   KPIs at all).

## Known limitations / follow-ups

- **Canvas plots don't render yet** — blocked on the `reports` mount
  allowing `POST /plot-custom` (see point 3 above). This is the main
  outstanding backend follow-up.
- **Canvas Builder comparison mode won't work correctly in demo** —
  `useColumnInputs.js` and `useFetchScenarios` (sibling-scenario list) were
  deliberately left on `apiClient`, unrouted. The `demoClient` rewrite model
  assumes one active `demoId` per session; comparison mode needs multiple
  sibling scenarios addressed in parallel, which doesn't fit that model
  without a more invasive per-call scenario override. Expect these calls to
  fail quietly (empty options) rather than crash.
- **Tool run/validate flow is still browse-only** — `useToolParams`'s GET
  now works, so a tool's parameter form can be viewed, but the write-adjacent
  POST routes (`save-config`, `validate-field`, `parameter-metadata`,
  `check`) are excluded, and `useInputValidation`'s underlying `/check` call
  will fail if exercised. Actually *running* a tool was never in scope.
- **Input Editor allows opening the edit grid in demo** — viewing the inputs
  table was in scope, but `useSaveInputs.js` (the PUT) was left unrouted by
  design; a Save attempt in demo will fail against the real backend with a
  synthetic `__demo__` project header. This should fail gracefully (existing
  `onError` toast), not silently or destructively, but is a rough edge if a
  cleaner "read-only Input Editor" is wanted later.
- **Database Editor and Pathway Builder** are hidden in demo (not mounted in
  the demo API at all) — no partial wiring attempted.

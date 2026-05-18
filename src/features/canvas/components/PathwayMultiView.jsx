import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';

import {
  LockOffIcon,
  LockOnIcon,
  RefreshIcon,
  TimelineIcon,
} from 'assets/icons';
import ConstructionStandardLegend from 'features/map/components/Map/Layers/ConstructionStandardLegend';
import { useMapStore } from 'features/map/stores/mapStore';
import { useProjectStore } from 'features/project/stores/projectStore';
import { usePathwayOverview } from 'features/pathway/hooks/usePathwayOverview';

import { useCanvasStore } from '../stores/canvasStore';
import useYAxisAlignment from '../hooks/useYAxisAlignment';
import CanvasScenarioHeader from './CanvasScenarioHeader';
import CanvasMap from './CanvasMap';
import CanvasPlot, { fitPlotToParent } from './CanvasPlot';
import PathwayCompareSelect from './PathwayCompareSelect';
import { FeatureCardShell } from './featureCardCommon';
import {
  ForceScopedMapContext,
  MapInstanceContext,
  createMapInstanceStore,
} from './mapInstance';

// Per-row map view-state: chrome (extrude / visibility / labels /
// colour mode / filters) plus `viewState`. Two consumers:
//
//  - `snapshotMapView()` seeds a fresh per-row store on mount so
//    the map opens at the singleton's current view (no
//    world-view flash) with familiar chrome. `cameraOptions` is
//    DELIBERATELY excluded — seeding it would flip
//    `useCameraFitBounds`'s `cameraOptionsCalculated` gate to
//    true and the per-row map would never auto-fit to its own
//    scenario zone.
//
//  - `MAP_SYNC_KEYS` (= the same set + `cameraOptions`) is what
//    the locked-mode Refresh propagates from row 1 to rows 2+.
//    `cameraOptions` is included here because at sync time it's
//    already populated from row 1's fit and we want rows 2+ to
//    inherit row 1's zoom / centre / bearing.
const VIEW_STATE_KEYS = [
  'viewState',
  'extruded',
  'visibility',
  'mapLabels',
  'colorMode',
  'filters',
];
const MAP_SYNC_KEYS = ['cameraOptions', ...VIEW_STATE_KEYS];

const snapshotMapView = () => {
  const singleton = useMapStore.getState();
  const seed = {};
  for (const key of VIEW_STATE_KEYS) seed[key] = singleton[key];
  return seed;
};

// Filter the chart's x-axis to label only the years ending in `5`
// (Y_2005, Y_2015, …) — same affordance as the pathway-single
// timeline strip. Driven via `Plotly.relayout` rather than editing
// the figure template because the same backend script also feeds
// the standalone Pathway Builder where every year is intentionally
// labelled.
function applyEndsInFiveTicks(div) {
  if (!div || !window.Plotly?.relayout) return;
  const layout = div._fullLayout;
  const xData = div.data?.[0]?.x;
  if (!Array.isArray(xData) || xData.length === 0) return;

  const isCategorical = layout?.xaxis?.type === 'category';
  const matches = xData
    .map((raw) => {
      const m = String(raw).match(/(\d+)/);
      return m ? { raw, year: parseInt(m[1], 10) } : null;
    })
    .filter((entry) => entry && entry.year % 10 === 5);
  if (matches.length === 0) return;

  const tickvals = isCategorical
    ? matches.map((m) => m.raw)
    : matches.map((m) => m.year);
  const ticktext = matches.map((m) => `Y_${m.year}`);

  window.Plotly.relayout(div, {
    'xaxis.tickmode': 'array',
    'xaxis.tickvals': tickvals,
    'xaxis.ticktext': ticktext,
    'xaxis.showgrid': true,
  });
}

// Synthetic key for the "shared" plot-config override slot in
// `pathwayPlotConfigs`. Decouples it from any pathway name so a
// row's own override (under `pathwayName`) and the shared override
// can coexist — required for the unlocked-edit-stays-local rule:
// editing the first row in unlocked mode must NOT spill into the
// other rows' fallback.
const SHARED_OVERRIDE_KEY = '__shared__';

// Move the y-axis (ticks + title) to the right side of the chart.
// Mirrors PathwayTimelineStrip's relayout so multi-view rows read
// the same way as the single-pathway timeline strip.
//
// `tickformat: '~s'` is only applied when the backend hasn't already
// pinned a percentage format on the axis — otherwise the SI prefix
// override silently strips the `%` suffix and the percentage chart
// (`shaded_stack_percentage_cumulative`) reads as raw numbers.
function applyYAxisRight(div) {
  if (!div || !window.Plotly?.relayout) return;
  const existingFormat = div._fullLayout?.yaxis?.tickformat;
  const isPercent =
    typeof existingFormat === 'string' && existingFormat.includes('%');
  const update = {
    'yaxis.side': 'right',
    'yaxis.ticklabelposition': 'outside',
    'yaxis.automargin': true,
  };
  if (!isPercent) {
    update['yaxis.tickformat'] = '~s';
  }
  window.Plotly.relayout(div, update);
}

const STATE_REF_TAG = 'cea-pathway-state-reference';

// Draw a black dashed vertical line on the chart at every year that
// has a state in this pathway. `xref: 'x'` + `yref: 'paper'` lets
// the line span the full plot height regardless of the y-range.
// Replaces any existing reference shape we set previously without
// touching shapes the backend may have added.
function applyStateReferenceLines(div, stateYears) {
  if (!div || !window.Plotly?.relayout) return;
  const layout = div._fullLayout;
  if (!layout) return;
  const xData = div.data?.[0]?.x;
  if (!Array.isArray(xData) || xData.length === 0) return;

  const isCategorical = layout?.xaxis?.type === 'category';
  const positions = (Array.isArray(stateYears) ? stateYears : [])
    .map((year) => {
      if (!isCategorical) return year;
      const found = xData.find(
        (raw) => String(raw).match(/(\d+)/)?.[1] === String(year),
      );
      return found ?? null;
    })
    .filter((v) => v != null);

  const otherShapes = (layout.shapes || []).filter(
    (s) => s?.name !== STATE_REF_TAG,
  );
  // Extend the line 20px below the x-axis. Paper coords are 0..1
  // over the plot area's pixel height — so 20px maps to 20 / h.
  const plotHeight = layout?._size?.h;
  const y0 = plotHeight > 0 ? -20 / plotHeight : 0;
  const refLines = positions.map((x) => ({
    name: STATE_REF_TAG,
    type: 'line',
    xref: 'x',
    yref: 'paper',
    x0: x,
    x1: x,
    y0,
    y1: 1,
    line: { color: '#000', width: 1, dash: 'dash' },
    layer: 'above',
  }));

  window.Plotly.relayout(div, { shapes: [...otherShapes, ...refLines] });
}

// Corner-resize handle styled like react-grid-layout's default
// (`border-right` + `border-bottom` L-shape). Pathway-multi rows
// don't use rgl, so we render the same visual ourselves and drive
// it with pointer events. The hit area is wider than the painted
// L so the handle is grabbable without pixel-hunting.
const ResizeCornerHandle = ({ getStartSize, onResize, ariaLabel }) => {
  const dragRef = useRef(null);

  const handlePointerMove = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      onResize(drag.start, e.clientX - drag.x, e.clientY - drag.y);
    },
    [onResize],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      start: getStartSize(),
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      style={resizeHandleStyle}
      aria-label={ariaLabel ?? 'Resize'}
      role="separator"
    >
      <span style={resizeHandleMarkStyle} aria-hidden="true" />
    </div>
  );
};

// Larger transparent box that catches the pointer; the painted
// L-shape lives inside as a non-interactive child so the visual
// stays small while the grab area is roomy.
const resizeHandleStyle = {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 20,
  height: 20,
  cursor: 'nwse-resize',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'flex-end',
  userSelect: 'none',
  touchAction: 'none',
  zIndex: 2,
};

const resizeHandleMarkStyle = {
  // Matches `react-grid-layout/css/styles.css`'s
  // `.react-resizable-handle::after`.
  width: 5,
  height: 5,
  marginRight: 3,
  marginBottom: 3,
  borderRight: '2px solid rgba(0, 0, 0, 0.4)',
  borderBottom: '2px solid rgba(0, 0, 0, 0.4)',
};

/**
 * Multi-pathway view — row-based layout. One row per selected
 * pathway; each row holds a pathway-name title card, a title map
 * (the pathway's most recent state) and the Emission Timeline
 * plot. The X-axis range and Y-axis range are unified across rows
 * so they're visually comparable.
 *
 * Renders only when `view === 'pathway-multi'`. The picker dropdown
 * sits in the top header alongside the scenario name, so the user
 * can change picks without leaving the row layout.
 */
const PathwayMultiView = ({ onOpenDrawer } = {}) => {
  const view = useCanvasStore((s) => s.view);
  const setup = useCanvasStore((s) => s.comparisonSetup);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const fixLayout = useCanvasStore((s) => s.fixLayout);
  const parentScenario = useCanvasStore((s) => s.parentScenario);
  const projectScenario = useProjectStore((s) => s.scenario);
  const project = useProjectStore((s) => s.project);
  // Reused from compare-mode for pathway-multi's "all rows follow
  // row 1" lock. Drives three things:
  //  - resize handles: only the first row carries them when locked
  //  - editing chrome (Edit / Refit / Delete + map toolbar): only
  //    the first row when locked, every row when unlocked
  //  - plot-config WRITE target: locked → SHARED slot (so future
  //    edits propagate to rows without their own override),
  //    unlocked → row's own slot (edits stay local)
  // Reads always prefer a row's own override before falling back
  // to shared, so toggling lock never silently drops a per-row edit.
  const mirrorsLocked = useCanvasStore((s) => s.mirrorsLocked);
  const setMirrorsLocked = useCanvasStore((s) => s.setMirrorsLocked);
  const enterPathwayMulti = useCanvasStore((s) => s.enterPathwayMulti);
  const stopCompareMode = useCanvasStore((s) => s.stopCompareMode);
  const { data: overview } = usePathwayOverview();

  // Shared row dimensions — driven by the FIRST row's resize
  // grippers and applied to every other row so they track origin,
  // mirroring how `mirrorsLocked` syncs columns in compare modes.
  // Two custom corner-arrow handles on the first row:
  //   - one inside the map card (drives `mapWidth` + row `height`)
  //   - one inside the body (drives row `width` + `height`)
  // Mirror rows lock to whatever those handles produce.
  //
  // Lives on `canvasStore` (not in component state) so resize
  // gestures fire through `setState`, hit the autosave subscriber,
  // and round-trip through undo / reload.
  const rowSize = useCanvasStore((s) => s.pathwayMultiRowSize);
  const setRowSize = useCanvasStore((s) => s.setPathwayMultiRowSize);

  // Per-pathway plot-config overrides keyed by `__shared__` (the
  // shared slot, used in locked mode and as fallback) or a pathway
  // name (a row's own override). Populated when the user saves from
  // the chart card's Edit drawer; lifted to the store for the same
  // autosave / undo / reload reasons as `pathwayMultiRowSize`.
  const pathwayPlotConfigs = useCanvasStore((s) => s.pathwayMultiPlotConfigs);
  const setPathwayMultiPlotConfig = useCanvasStore(
    (s) => s.setPathwayMultiPlotConfig,
  );
  const replacePathwayMultiPlotConfigs = useCanvasStore(
    (s) => s.replacePathwayMultiPlotConfigs,
  );
  // Counter bumped on every override save. Passed to
  // `useYAxisAlignment` as its `generation` so the alignment hook
  // forgets the previous render's plot divs — otherwise stale divs
  // (from e.g. an absolute-value run) would mix with the new
  // percentage charts and Plotly would re-apply the old `[0, ~70M]`
  // range to data that's now `0–100`, squashing it flat.
  const [plotConfigGeneration, setPlotConfigGeneration] = useState(0);
  const setPathwayPlotConfig = useCallback(
    (name, nextConfig) => {
      setPathwayMultiPlotConfig(name, nextConfig);
      setPlotConfigGeneration((g) => g + 1);
    },
    [setPathwayMultiPlotConfig],
  );

  // Unify the y-axis range across every row's emission-timeline so
  // the rows are visually comparable. Only enabled when rows are
  // LOCKED — in unlocked mode every row can carry its own plot
  // config (different plot-type, different y-units), and forcing a
  // unified range would squash whichever row's data sits inside the
  // larger sibling's domain (e.g. a 0–100% chart pinned to a
  // 0–70M absolute range reads as a flat strip near zero).
  //
  // `plotConfigGeneration` (bumped on every Edit-drawer save and
  // on Refresh) is the cache invalidator: it forces the hook to
  // drop previously tracked divs so a fresh round of `onPlotReady`
  // calls populates a clean set with the new plot type's ranges.
  const pathwayCount = setup?.pathwayNames?.length ?? 0;
  const { handlePlotReady: handleAlignPlot } = useYAxisAlignment(
    pathwayCount > 1 && mirrorsLocked,
    pathwayCount,
    plotConfigGeneration,
  );
  const onRowPlotReady = useCallback(
    (div) => handleAlignPlot('pathway-emission-timeline', div),
    [handleAlignPlot],
  );

  const pathwayNames = setup?.pathwayNames ?? [];
  const scenario = parentScenario || projectScenario;

  // Per-row map stores registered by each `PathwayRow` on mount.
  // Lets the Refresh handler reach into rows 2+ when locked and
  // mirror row 1's map view there — the cross-row map sync the
  // user expects from a "resync to first row" affordance.
  const mapStoresRef = useRef(new Map());
  const registerMapStore = useCallback((name, store) => {
    if (store) mapStoresRef.current.set(name, store);
    else mapStoresRef.current.delete(name);
  }, []);

  // Refresh = "resync all rows to row 1". Three coordinated steps:
  //   1. Plot configs: promote row 1's effective config (own
  //      override or, failing that, the existing shared slot) into
  //      `SHARED_OVERRIDE_KEY` and drop every per-row override.
  //      Every row now reads the same plot-config.
  //   2. Charts: bump `refreshTick` so each row refits its Plotly
  //      figure to the row body's current dimensions.
  //   3. Maps: reset every row's `cameraOptions` so each fits to
  //      its own scenario zone via `useCameraFitBounds`. When
  //      LOCKED, after row 1's fly-to settles, copy row 1's full
  //      map state (camera + view-state chrome) onto rows 2+ so
  //      every title map matches row 1.
  // Mirrors the compare-mode Refresh affordance
  // (`resyncMirrorsToOrigin` + refit) adapted to the row stack.
  const [refreshTick, setRefreshTick] = useState(0);
  const handleRefreshAll = useCallback(() => {
    const prev = useCanvasStore.getState().pathwayMultiPlotConfigs;
    const firstRow = pathwayNames[0];
    let nextConfigs = {};
    if (firstRow) {
      const firstEffective = prev[firstRow] ?? prev[SHARED_OVERRIDE_KEY];
      if (firstEffective !== undefined) {
        nextConfigs = { [SHARED_OVERRIDE_KEY]: firstEffective };
      }
    }
    replacePathwayMultiPlotConfigs(nextConfigs);
    setPlotConfigGeneration((g) => g + 1);
    setRefreshTick((t) => t + 1);

    // Step 1: reset every row's camera so each fits its own zone
    // bbox via `useCameraFitBounds`. When unlocked we stop here —
    // rows are independent.
    mapStoresRef.current.forEach((store) => {
      store.setState({ cameraOptions: null });
    });
    if (!mirrorsLocked || pathwayNames.length < 2) return;

    // Step 2 (locked only): once row 1's fit-bounds animation has
    // settled, copy its FULL map settings to rows 2+ — camera,
    // view state, extrude, layer visibility, labels, colour mode,
    // filters. The fly-to interpolation in `useCameraFitBounds`
    // runs ~1s — wait a bit longer so the sync reads the
    // post-animation view, not the mid-flight one.
    const firstName = pathwayNames[0];
    setTimeout(() => {
      const firstStore = mapStoresRef.current.get(firstName);
      if (!firstStore) return;
      const firstState = firstStore.getState();
      const sync = {};
      for (const key of MAP_SYNC_KEYS) sync[key] = firstState[key];
      for (let i = 1; i < pathwayNames.length; i += 1) {
        const other = mapStoresRef.current.get(pathwayNames[i]);
        if (other) other.setState(sync);
      }
    }, 1500);
  }, [pathwayNames, mirrorsLocked, replacePathwayMultiPlotConfigs]);

  // Map of pathway -> { years, lastYear }. `years` drives the
  // dashed reference lines drawn at every state year on the
  // chart; `lastYear` selects the title-map's scenario folder
  // (the pathway's most recent state — most informative single
  // snapshot of the pathway's effect).
  const yearsByPathway = useMemo(() => {
    const out = {};
    for (const p of overview?.pathways ?? []) {
      const years = (p.years ?? []).map(Number).filter(Number.isFinite);
      if (years.length > 0) {
        out[p.pathway_name] = { years, lastYear: Math.max(...years) };
      }
    }
    return out;
  }, [overview]);

  // Shared timescale across rows. The rendered Plotly figures
  // honour their own `layout.xaxis` settings, so we expose the
  // shared range as a hint via the script's `period-start` /
  // `period-end` parameters when those are wired; for now the
  // cross-row alignment relies on every chart sharing the same
  // year domain (Plotly auto-fits to data, which is the same
  // pathway data window).
  const sharedRange = useMemo(() => {
    if (!overview?.pathways) return null;
    const selected = overview.pathways.filter((p) =>
      pathwayNames.includes(p.pathway_name),
    );
    const allYears = selected.flatMap((p) => p.years ?? []).map(Number);
    if (allYears.length === 0) return null;
    return [Math.min(...allYears), Math.max(...allYears)];
  }, [overview, pathwayNames]);

  if (view !== 'pathway-multi' || !scenario) {
    return null;
  }

  return (
    <ForceScopedMapContext.Provider value={true}>
      <div style={canvasWrapperStyle}>
        <div style={enableEdit ? canvasStyle : canvasExportStyle}>
          <CanvasScenarioHeader trailing={<PathwayCompareSelect />} />
          <div style={rowStackStyle}>
          {pathwayNames.length === 0 ? (
            <div style={emptyHintStyle}>
              Pick at least one pathway to compare.
            </div>
          ) : (
            pathwayNames.map((name, i) => {
              // Read priority — ALWAYS prefer the row's own
              // override, falling back to the shared override.
              // Toggling lock therefore never silently destroys a
              // per-row edit that was made while unlocked; rows
              // hold onto their own config until the user resets
              // them explicitly (via Refresh, which clears every
              // per-row override).
              //
              // Write priority — driven by lock state:
              //  - locked   → writes to the SHARED key. New edits
              //    propagate to every row that doesn't already
              //    carry its own override.
              //  - unlocked → writes to the row's OWN key. New
              //    edits stay local to that row.
              const sharedOverride = pathwayPlotConfigs[SHARED_OVERRIDE_KEY];
              const ownOverride = pathwayPlotConfigs[name];
              const plotConfigOverride = ownOverride ?? sharedOverride;
              const writeKey = mirrorsLocked ? SHARED_OVERRIDE_KEY : name;
              const pathwayInfo = yearsByPathway[name];
              return (
                <PathwayRow
                  key={name}
                  pathwayName={name}
                  scenario={scenario}
                  project={project}
                  lastYear={pathwayInfo?.lastYear}
                  stateYears={pathwayInfo?.years}
                  sharedRange={sharedRange}
                  isFirst={i === 0}
                  isLast={i === pathwayNames.length - 1}
                  enableEdit={enableEdit}
                  layoutLocked={fixLayout}
                  locked={mirrorsLocked}
                  onToggleLock={() => setMirrorsLocked(!mirrorsLocked)}
                  onRefresh={handleRefreshAll}
                  refreshTick={refreshTick}
                  registerMapStore={registerMapStore}
                  onPlotReady={onRowPlotReady}
                  onOpenDrawer={onOpenDrawer}
                  rowSize={rowSize}
                  onRowResize={setRowSize}
                  plotConfigOverride={plotConfigOverride}
                  onPlotConfigSave={(next) =>
                    setPathwayPlotConfig(writeKey, next)
                  }
                  onRemovePathway={() => {
                    const remaining = pathwayNames.filter((p) => p !== name);
                    if (remaining.length === 0) {
                      stopCompareMode();
                    } else {
                      enterPathwayMulti(scenario, remaining);
                    }
                  }}
                />
              );
            })
          )}
          </div>
        </div>
      </div>
    </ForceScopedMapContext.Provider>
  );
};

/**
 * One pathway's row. Layout mirrors a pathway-single column rotated
 * 90°: a pathway-name title card at the top, then a body that
 * splits horizontally into a title-map card (final state of the
 * pathway, at `state_<lastYear>`) on the left and an Emission
 * Timeline card on the right. Both inner widgets are wrapped in
 * `FeatureCardShell`s so they read as the same chrome family as
 * other compare modes' tiles.
 *
 * Rows are separated by a horizontal divider line (mirrors how
 * `ComparisonView` separates columns with vertical lines). The body
 * resizes in both axes via plain CSS `resize: both`.
 */
const PathwayRow = ({
  pathwayName,
  scenario,
  project,
  lastYear,
  stateYears,
  sharedRange,
  isFirst,
  isLast,
  enableEdit,
  layoutLocked,
  locked,
  onToggleLock,
  onRefresh,
  refreshTick,
  registerMapStore,
  onPlotReady,
  onOpenDrawer,
  onRemovePathway,
  rowSize,
  onRowResize,
  plotConfigOverride,
  onPlotConfigSave,
}) => {
  const slotRef = useRef(null);
  const bodyRef = useRef(null);
  const mapAreaRef = useRef(null);
  const plotConfig = useMemo(() => {
    // Default base — rendered on first mount and whenever the user
    // hasn't saved an Edit-drawer override yet.
    const base = {
      script: 'plot-pathway-emission-timeline',
      parameters: {
        // Shared year range hint so every row's chart locks to the
        // same x-axis window. Rows also align via the pathway data
        // itself spanning the same years.
        ...(sharedRange
          ? { 'period-start': sharedRange[0], 'period-end': sharedRange[1] }
          : {}),
      },
    };
    // If the user saved an override via the Edit drawer, layer it
    // on top of the default — keeping `existing-pathway-names`
    // pinned to *this* row's pathway so the override stays scoped
    // even if the drawer's form briefly held a different value.
    const source =
      plotConfigOverride && plotConfigOverride.script
        ? plotConfigOverride
        : base;
    return {
      ...source,
      parameters: {
        ...(source.parameters || {}),
        'existing-pathway-names': [pathwayName],
      },
    };
  }, [pathwayName, sharedRange, plotConfigOverride]);

  // Map shows the pathway's most-recent state — the natural
  // "outcome snapshot" for a pathway-multi summary. Falls back to
  // the parent scenario if the overview hasn't loaded yet.
  const mapScenario =
    lastYear != null
      ? `${scenario}/outputs/pathways/${pathwayName}/state_${lastYear}`
      : scenario;

  // Per-row mapInstance store so each row's toolbar (Layers /
  // Extrude / Reset Camera / Reset Compass) and camera act on its
  // own map rather than the shared singleton. The
  // `ForceScopedMapContext` wrapper above this view tells the
  // scoped hooks to always read this per-row store, so each row
  // can fit-bounds to its own scenario zone independently. Seed
  // with the singleton snapshot (chrome only — no `cameraOptions`)
  // so the map opens at the singleton's current view before
  // `useCameraFitBounds` settles it onto the row's zone.
  const [mapStore] = useState(() => {
    const s = createMapInstanceStore();
    s.setState(snapshotMapView());
    return s;
  });

  // Register this row's map store with the parent so the Refresh
  // handler can reach in and mirror row 1's view across the others
  // when locked. Cleanup on unmount drops the entry so a removed
  // pathway doesn't linger in the registry.
  useEffect(() => {
    registerMapStore?.(pathwayName, mapStore);
    return () => registerMapStore?.(pathwayName, null);
  }, [pathwayName, mapStore, registerMapStore]);

  // Refresh: when the parent bumps `refreshTick`, refit the Plotly
  // chart to the row body's current dimensions. The map camera
  // reset is owned by the parent's `handleRefreshAll` so the
  // locked-mode mirror copy can fire after row 1's fit settles.
  // Skipped on the initial render so first mount doesn't run.
  const initialTickRef = useRef(refreshTick);
  useEffect(() => {
    if (refreshTick === initialTickRef.current) return;
    slotRef.current
      ?.querySelectorAll('.js-plotly-plot, .plotly-graph-div')
      .forEach((div) => fitPlotToParent(div));
  }, [refreshTick]);

  // Live caption lifted from the chart's main title (e.g.
  // "Cumulative Emissions (kgCO2e) by Year") — rendered as the
  // chart card's subtitle, mirroring `PathwayTimelineStrip`.
  const [caption, setCaption] = useState('');
  const chartTitleNode = caption ? (
    <>
      Pathway Emission Timeline
      <span style={titleSeparatorStyle}>—</span>
      <span style={titleSubtitleStyle} title={caption}>
        {caption}
      </span>
    </>
  ) : (
    'Pathway Emission Timeline'
  );

  // Toolbar gating mirrors compare-mode editing: when rows are
  // locked, only the FIRST row exposes the four-button map toolbar
  // (origin-only); when unlocked, every row's toolbar shows so each
  // map can be panned / styled independently. Always gated on
  // `enableEdit` so Export View hides the chrome everywhere. The
  // chart card's three-button row (Edit / Refit / Delete) follows
  // the same `(!locked || isFirst)` rule.
  //
  // `layoutLocked` (= store.fixLayout, the navigator's Freeze Layout
  // toggle) is intentionally NOT factored in here — it freezes
  // *layout* (resize handles), not editing chrome. Mirrors how
  // `CanvasColumn` keeps Edit / Delete / toolbars visible when the
  // grid is frozen.
  const showMapToolbar = enableEdit && (!locked || isFirst);
  const showCardActions = enableEdit && (!locked || isFirst);
  // Resize affordances follow `fixLayout` only — Export View
  // (`enableEdit === false`) doesn't freeze the layout, mirroring
  // `CanvasColumn`'s `mapEditable = !layoutLocked && layoutEditableHere`
  // gate.
  const showResizeHandles = !layoutLocked && (!locked || isFirst);

  const handleRefitChart = () => {
    slotRef.current
      ?.querySelectorAll('.js-plotly-plot, .plotly-graph-div')
      .forEach((div) => fitPlotToParent(div));
  };

  const handleEditChart = () => {
    if (!onOpenDrawer) return;
    onOpenDrawer({
      plotConfig,
      scenarioOverride:
        project && scenario ? { project, scenarioName: scenario } : null,
      // Pin the pathway pick — the picker dropdown above is the
      // source of truth, not the per-card form.
      extraReadonlyFields: ['existing-pathway-names'],
      // Plot script is fixed for this card; Back would let the user
      // swap to a completely different plot.
      allowBack: false,
      // Persist Run as this row's plot-config override so the chart
      // re-renders with the new `plot-type` / parameter selections.
      onSave: (next) => onPlotConfigSave?.(next),
    });
  };

  return (
    <div
      style={{
        ...rowStyle,
        borderBottom: isLast ? 'none' : '1px solid #e0e0e0',
      }}
    >
      <div style={rowHeaderStyle}>
        <div style={titleCardStyle} title={pathwayName}>
          {pathwayName}
        </div>
        {/* Refresh + Lock sit next to the FIRST row's title card —
            mirrors how `CanvasColumn` puts them next to the origin
            column's title card in pathway-single. They control the
            whole multi-view (not just this row) so they only need
            one home. */}
        {isFirst && enableEdit && (
          <>
            <div className="cea-card-icon-button-container">
              <Tooltip title="Refit charts" placement="bottom">
                <Button
                  type="text"
                  icon={<RefreshIcon />}
                  onClick={onRefresh}
                  aria-label="Refit charts"
                />
              </Tooltip>
            </div>
            <div className="cea-card-icon-button-container">
              <Tooltip
                title={
                  locked
                    ? 'Unlock rows — let each row resize and edit independently'
                    : 'Lock rows — sync resize and propagate edits from row 1'
                }
                placement="bottom"
              >
                <Button
                  type="text"
                  icon={locked ? <LockOnIcon /> : <LockOffIcon />}
                  onClick={onToggleLock}
                  aria-label={locked ? 'Unlock rows' : 'Lock rows'}
                />
              </Tooltip>
            </div>
          </>
        )}
      </div>
      <div
        ref={bodyRef}
        style={{
          ...rowBodyStyle,
          // Native CSS resize is replaced by the custom corner
          // arrow rendered below — only the first row carries it,
          // mirrors are locked.
          resize: 'none',
          position: 'relative',
          ...(rowSize?.width != null ? { width: rowSize.width } : null),
          ...(rowSize?.height != null ? { height: rowSize.height } : null),
        }}
      >
        <div
          ref={mapAreaRef}
          style={{
            ...mapAreaStyle,
            position: 'relative',
            // First-row map width is driven by the in-map corner
            // arrow; mirror rows track that pixel value.
            ...(rowSize?.mapWidth != null
              ? { width: rowSize.mapWidth }
              : null),
          }}
        >
          {/* Map renders frame-less (no FeatureCardShell border) to
              match the pathway-single primary map tile, with the
              construction-archetypes legend pinned below. */}
          <MapInstanceContext.Provider value={mapStore}>
            <div style={mapBodyStyle}>
              <CanvasMap
                project={project}
                scenario={mapScenario}
                showToolbar={showMapToolbar}
              />
            </div>
            <ConstructionStandardLegend style={legendStyle} />
          </MapInstanceContext.Provider>
          {showResizeHandles && (
            <ResizeCornerHandle
              ariaLabel="Resize title map"
              getStartSize={() => {
                const mapRect = mapAreaRef.current?.getBoundingClientRect();
                const bodyRect = bodyRef.current?.getBoundingClientRect();
                return {
                  mapWidth: mapRect?.width ?? 0,
                  height: bodyRect?.height ?? 0,
                };
              }}
              onResize={(start, dx, dy) => {
                onRowResize?.((prev) => ({
                  ...prev,
                  mapWidth: Math.max(160, start.mapWidth + dx),
                  height: Math.max(200, start.height + dy),
                }));
              }}
            />
          )}
        </div>
        <div ref={slotRef} style={chartAreaStyle}>
          <FeatureCardShell
            title={chartTitleNode}
            icon={TimelineIcon}
            // Edit / Refit / Delete follow the locked-mirror gate:
            // only the first row when locked (the one writer to the
            // shared slot), every row when unlocked (per-row writes).
            onEdit={
              showCardActions && onOpenDrawer ? handleEditChart : undefined
            }
            onRefit={showCardActions ? handleRefitChart : undefined}
            onDeleteCard={
              showCardActions && onRemovePathway ? onRemovePathway : undefined
            }
          >
            {/* Inner padding (top + bottom emphasised) so the
                chart isn't pinched against the card edges — the
                plot's tick labels and legend need breathing room. */}
            <div style={chartCardBodyStyle}>
              <CanvasPlot
                scenario={scenario}
                plotConfig={plotConfig}
                onCaption={setCaption}
                onPlotReady={(div) => {
                  // Apply ticks (Y_xxxx5 only), flip the y-axis to
                  // the right, and overlay dashed reference lines
                  // at every state year — *before* handing the div
                  // to the parent's y-axis alignment hook so it
                  // reads post-relayout ranges. Cross-row x-axis
                  // alignment is handled in the backend
                  // (`emission_timeline.py` pads zero rows when
                  // `period-start` is earlier than the pathway's
                  // first data year).
                  applyEndsInFiveTicks(div);
                  applyYAxisRight(div);
                  applyStateReferenceLines(div, stateYears);
                  onPlotReady?.(div);
                }}
              />
            </div>
          </FeatureCardShell>
        </div>
        {showResizeHandles && (
          <ResizeCornerHandle
            ariaLabel="Resize row"
            getStartSize={() => {
              const rect = bodyRef.current?.getBoundingClientRect();
              return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
            }}
            onResize={(start, dx, dy) => {
              onRowResize?.((prev) => ({
                ...prev,
                width: Math.max(480, start.width + dx),
                height: Math.max(200, start.height + dy),
              }));
            }}
          />
        )}
      </div>
    </div>
  );
};

const canvasWrapperStyle = {
  width: '100%',
  display: 'flex',
  justifyContent: 'flex-start',
};

const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '16px 16px 24px 16px',
  width: 'fit-content',
  minWidth: 800,
  height: 'fit-content',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const canvasExportStyle = {
  ...canvasStyle,
  padding: '8px 16px 16px 16px',
};

const rowStackStyle = {
  display: 'flex',
  flexDirection: 'column',
};

// Each row is a stack of [title card, body]; rows are visually
// separated by a horizontal divider written into the row's
// `borderBottom` (mirrors how `ComparisonView` separates compare
// columns with `borderRight`). Last row's border is dropped so the
// stack ends cleanly.
const rowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: '16px 0',
};

const rowHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

// Mirrors `CanvasColumn.titleCardStyle` so the pathway-multi row
// header reads as the same chrome family as a pathway-single
// column's `Y_<year>` card.
const titleCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '4px 14px',
  boxSizing: 'border-box',
  minWidth: 200,
  height: 39.3,
  display: 'flex',
  alignItems: 'center',
  fontSize: 14,
  fontWeight: 600,
  color: '#222',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const rowBodyStyle = {
  // Two-pane body: title map on the left, emission timeline
  // stretching to fill the remaining width. Resizing is driven
  // by the custom corner-arrow handles below — only the first
  // row carries them; the rest mirror via inline width/height.
  display: 'flex',
  flexDirection: 'row',
  gap: 12,
  width: '100%',
  minWidth: 600,
  minHeight: 240,
  height: 320,
};

const mapAreaStyle = {
  // `flex: '0 0 auto'` (not a fixed basis) so an explicit `width`
  // — set by the first row's CSS resize handle and mirrored on
  // the others — wins over the flex layout. `overflow: hidden` is
  // required for native CSS `resize` to take effect.
  flex: '0 0 auto',
  width: 320,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  overflow: 'hidden',
};

const mapBodyStyle = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  position: 'relative',
};

// Construction-archetypes legend, mirroring the pathway-single
// primary tile's `overviewLegendStyle` so the chrome reads the same
// across modes. Card-style chrome is stripped because the legend is
// part of the row, not a popover.
const legendStyle = {
  width: '100%',
  marginTop: 0,
  boxShadow: 'none',
  backgroundColor: 'transparent',
  padding: 0,
  maxHeight: 'none',
  flexShrink: 0,
};

const chartAreaStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
};

// Inner padding around the timeline chart inside the
// `FeatureCardShell`. Top + bottom only — horizontal padding is
// owned by `FeatureCardShell.cardStyle` (`padding: '8px 16px'`),
// matching how `FeatureCardPlot` lays out its plot section in
// other modes (no extra horizontal padding inside the body).
const chartCardBodyStyle = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: 'flex',
  padding: '12px 0',
};

// Subtitle chrome on the chart card's title — em-dash separator
// followed by the live caption lifted from the chart's main title
// (e.g. "Cumulative Emissions (kgCO2e) by Year"). Mirrors the
// pathway-single timeline strip's title row.
const titleSeparatorStyle = {
  color: '#999',
  fontWeight: 400,
  margin: '0 8px',
};

const titleSubtitleStyle = {
  fontWeight: 400,
  fontSize: 13,
  color: '#666',
};

const emptyHintStyle = {
  padding: '24px',
  textAlign: 'center',
  color: '#888',
  fontStyle: 'italic',
};

export default PathwayMultiView;

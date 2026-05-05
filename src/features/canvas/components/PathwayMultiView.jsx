import { useCallback, useMemo, useRef, useState } from 'react';
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
  MapInstanceContext,
  createMapInstanceStore,
} from './mapInstance';

// Snapshot of singleton view-state keys copied into each per-row
// map store on creation, so the map opens at the active viewport's
// camera (typically already centred on the project) rather than at
// the global default of `(lat 0, lng 0, zoom 0)`. Mirrors
// `FeatureCardMap`'s `VIEW_STATE_KEYS`.
const VIEW_STATE_KEYS = [
  'viewState',
  'cameraOptions',
  'extruded',
  'visibility',
  'mapLabels',
  'colorMode',
  'filters',
];

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
  // Reused as the row-resize lock in pathway-multi (mirrors aren't a
  // concept here; the state slot is otherwise unused in this mode).
  // Locked → `rowBodyStyle.resize = 'none'`; unlocked → `'both'`.
  const mirrorsLocked = useCanvasStore((s) => s.mirrorsLocked);
  const setMirrorsLocked = useCanvasStore((s) => s.setMirrorsLocked);
  const stackRef = useRef(null);
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
  const [rowSize, setRowSize] = useState({
    width: null,
    height: 320,
    mapWidth: 320,
  });

  // Per-pathway plot-config overrides keyed by pathway name.
  // Populated when the user runs a save from the chart card's Edit
  // drawer; each row reads its own override (or falls back to the
  // default config) so changing plot-type / parameters on one row
  // applies just to that pathway and survives a re-render.
  const [pathwayPlotConfigs, setPathwayPlotConfigs] = useState({});
  // Counter bumped on every override save. Passed to
  // `useYAxisAlignment` as its `generation` so the alignment hook
  // forgets the previous render's plot divs — otherwise stale divs
  // (from e.g. an absolute-value run) would mix with the new
  // percentage charts and Plotly would re-apply the old `[0, ~70M]`
  // range to data that's now `0–100`, squashing it flat.
  const [plotConfigGeneration, setPlotConfigGeneration] = useState(0);
  const setPathwayPlotConfig = useCallback((name, nextConfig) => {
    setPathwayPlotConfigs((prev) => ({ ...prev, [name]: nextConfig }));
    setPlotConfigGeneration((g) => g + 1);
  }, []);

  // Unify the y-axis range across every row's emission-timeline so
  // the rows are visually comparable. `useYAxisAlignment` collects
  // each chart div via `onPlotReady` and rewrites their
  // `yaxis.range` to the common max once they've all reported.
  const pathwayCount = setup?.pathwayNames?.length ?? 0;
  const { handlePlotReady: handleAlignPlot } = useYAxisAlignment(
    pathwayCount > 1,
    pathwayCount,
  );
  const onRowPlotReady = useCallback(
    (div) => handleAlignPlot('pathway-emission-timeline', div),
    [handleAlignPlot],
  );

  // Refit every Plotly figure currently rendered in the row stack.
  // Mirrors the compare-mode "Refresh" affordance — useful after
  // resizing rows or when a chart's container changed but the
  // figure's pixel dims didn't follow.
  const handleRefreshAll = () => {
    stackRef.current
      ?.querySelectorAll('.js-plotly-plot, .plotly-graph-div')
      .forEach((div) => fitPlotToParent(div));
  };

  const pathwayNames = setup?.pathwayNames ?? [];
  const scenario = parentScenario || projectScenario;

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
    <div style={canvasWrapperStyle}>
      <div style={enableEdit ? canvasStyle : canvasExportStyle}>
        <CanvasScenarioHeader trailing={<PathwayCompareSelect />} />
        <div ref={stackRef} style={rowStackStyle}>
          {pathwayNames.length === 0 ? (
            <div style={emptyHintStyle}>
              Pick at least one pathway to compare.
            </div>
          ) : (
            pathwayNames.map((name, i) => {
              // When locked, every row reads (and writes) the FIRST
              // row's override key — so editing any chart card
              // propagates the new plot-type / parameters to every
              // row in the stack. When unlocked, rows are
              // independent and each carries its own override.
              const overrideKey = mirrorsLocked ? pathwayNames[0] : name;
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
                  onPlotReady={onRowPlotReady}
                  onOpenDrawer={onOpenDrawer}
                  rowSize={rowSize}
                  onRowResize={setRowSize}
                  plotConfigOverride={pathwayPlotConfigs[overrideKey]}
                  onPlotConfigSave={(next) =>
                    setPathwayPlotConfig(overrideKey, next)
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
  // Extrude / Reset Camera / Reset Compass) acts on its own map
  // rather than the shared singleton. Same pattern `FeatureCardMap`
  // uses for compare-mode maps. Seed with the singleton snapshot so
  // the camera opens at the active viewport's view (typically
  // already centred on the project) instead of the default world
  // view at `(lat 0, lng 0, zoom 0)`.
  const [mapStore] = useState(() => {
    const s = createMapInstanceStore();
    s.setState(snapshotMapView());
    return s;
  });

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
                    ? 'Unlock rows — let each row resize independently'
                    : 'Lock rows — disable the resize handle'
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
            // All three actions follow the locked-mirror gate: only
            // the first row when locked (one writer, all rows
            // mirror via the shared override key), every row when
            // unlocked (per-row overrides).
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
                  // Apply pathway-single's "Y_xxxx5 only" tick
                  // filter and overlay dashed reference lines at
                  // every year that has a state in this pathway,
                  // *before* handing the div to the parent's
                  // y-axis alignment hook so the alignment reads
                  // the post-relayout axis range.
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

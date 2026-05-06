import { useCallback, useEffect, useMemo, useState } from 'react';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useCanvasPersistence } from '../hooks/useCanvasPersistence';
import { useResumeLastCanvas } from '../hooks/useResumeLastCanvas';
import { useFocusFeature } from '../hooks/useFocusFeature';
import NavigatorCard from './NavigatorCard';
import BottomCard from './BottomCard';
import LaunchView from './LaunchView';
import ComparisonView from './ComparisonView';
import PlotEditModal from './PlotEditModal';
import KpiPicker from './KpiPicker';

/**
 * Canvas Builder — root page. 2-column grid:
 *
 *   ┌──────────────┬──────────┐
 *   │  Navigator   │          │
 *   ├──────────────┤   Plot   │
 *   │   Canvas     │   tool   │
 *   ├──────────────┤          │
 *   │   Bottom     │          │
 *   └──────────────┴──────────┘
 *
 * The plot-tool column collapses to 0 width when no plot is being
 * edited; animating `grid-template-columns` produces the slide-in.
 *
 * Drawer state lives here (not in a view) so the tool column can
 * render at page level. Views call `openDrawer({ plotConfig, onSave })`
 * with an `onSave` closure that captures their own state.
 *
 * `mapBottomOpen` is a parallel switch that opens the bottom row
 * for Map cards — Map cards have no right-drawer (no plot-tool form)
 * but still want `MapLayerPropertiesCard` at the bottom. Both
 * conditions feed the same `bottomOpen` so the row animates the
 * same way regardless of which card type triggered it.
 */
const CanvasPage = () => {
  const view = useCanvasStore((s) => s.view);
  const canvasName = useCanvasStore((s) => s.canvasName);
  const columns = useCanvasStore((s) => s.columns);
  const launchCards = useCanvasStore((s) => s.launchCards);
  const columnCards = useCanvasStore((s) => s.columnCards);
  const project = useProjectStore((s) => s.project);

  // Subscribe to store changes and debounce-flush them to the
  // saved canvas folder while the user works. Idempotent — single
  // mount point owns the autosave debouncer.
  useCanvasPersistence();
  // Resume the last committed canvas on mount (per-project /
  // -scenario `localStorage` lookup). When no record exists, leaves
  // the store in its empty state and the canvas cell renders the
  // empty-state placeholder below.
  useResumeLastCanvas();

  // drawer = { plotConfig, onSave, cardId? } | null
  // `cardId` (when present) flags the FeatureCardPlot that owns the
  // plot being edited so it can paint its `editing` purple stroke.
  // Adding a brand-new card via the picker leaves it undefined.
  const [drawer, setDrawer] = useState(null);
  // `(activeMapCardId, activeMapColumnIndex)` identifies which
  // FeatureCardMap drives the bottom form. The column index is
  // load-bearing in compare mode: mirrors share `card.id` across
  // every column, so without it both the registry lookup and the
  // editing stroke would resolve ambiguously.
  const [activeMapCardId, setActiveMapCardId] = useState(null);
  const [activeMapColumnIndex, setActiveMapColumnIndex] = useState(null);

  // KPI picker anchor — captured at the moment a perimeter `+`
  // chooses the KPI pill, replayed against `addCard` once the
  // user confirms a multi-pick. `null` means the picker is closed.
  // Shape: { columnIndex, targetCardId, direction }. Lifted to
  // page level so any column / launch view can open the same
  // singleton modal without each view duplicating the wiring.
  const [kpiPickerAnchor, setKpiPickerAnchor] = useState(null);
  const openKpiPicker = useCallback((anchor) => {
    setKpiPickerAnchor(anchor);
    // Close any open editing surfaces so the modal isn't competing
    // for attention.
    setDrawer(null);
    setActiveMapCardId(null);
    setActiveMapColumnIndex(null);
  }, []);
  const closeKpiPicker = useCallback(() => setKpiPickerAnchor(null), []);

  // "Feature focus" landing — the OverviewCard's KpiRibbon pushes
  // the canvas route with `?focusFeature=<feature>` when the user
  // clicks a headline tile. We act on that exactly once per arrival:
  //   - existing card on the canvas with `kpiId.startsWith('<feature>.')`
  //     → scroll it into view + flash the CEA-purple stroke.
  //   - no matching card → open the picker pre-expanded to that
  //     feature's group so the user can add one in two clicks.
  // The hook strips the param from the URL on first capture so a
  // refresh / back navigation doesn't replay the action; `consume()`
  // gates the dispatch so it doesn't repeat as cards re-render.
  const { focusFeature, consume: consumeFocusFeature } = useFocusFeature();
  useEffect(() => {
    if (!focusFeature) return;
    // Wait until the canvas has loaded — `useResumeLastCanvas`
    // sets `canvasName` once the saved canvas (if any) is in. On
    // a brand-new entry with no saved canvas the user has nothing
    // to scroll into; the picker is the right action there too.
    if (!canvasName) return;
    const cards = view === 'launch' ? launchCards : (columnCards?.[0] ?? []);
    const prefix = `${focusFeature}.`;
    const match = cards.find(
      (c) =>
        c.type === 'kpi' &&
        typeof c.kpiId === 'string' &&
        c.kpiId.startsWith(prefix),
    );
    if (match) {
      // Defer one frame so the rgl-positioned card has its final
      // top/left applied before we scroll to it.
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-card-id="${match.id}"]`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('cea-card-flash');
        setTimeout(() => el.classList.remove('cea-card-flash'), 2000);
      });
    } else {
      // No matching card → open the picker anchored next to the
      // primary map tile (sentinel `'MAP'`, `direction: 'right'`)
      // so `addCard` lands the new card at a stable spot rather
      // than colliding with the map at (0, 0). `initialFeature`
      // pre-expands the right group inside the picker.
      setKpiPickerAnchor({
        columnIndex: view === 'launch' ? 'launch' : 0,
        targetCardId: 'MAP',
        direction: 'right',
        initialFeature: focusFeature,
      });
    }
    consumeFocusFeature();
  }, [
    focusFeature,
    canvasName,
    view,
    launchCards,
    columnCards,
    consumeFocusFeature,
  ]);

  const addCard = useCanvasStore((s) => s.addCard);
  const handleKpiPickerConfirm = useCallback(
    (kpiIds) => {
      if (kpiPickerAnchor && kpiIds.length > 0) {
        const { columnIndex, targetCardId, direction } = kpiPickerAnchor;
        // Stack new cards: the first anchors against the original
        // target / direction; each subsequent card anchors against
        // the previous one with `direction: 'bottom'` so they
        // line up vertically. `addCard` returns the new id which
        // we feed back as the next anchor.
        let nextTarget = targetCardId;
        let nextDir = direction;
        for (const kpiId of kpiIds) {
          const newId = addCard(columnIndex, {
            targetCardId: nextTarget,
            direction: nextDir,
            type: 'kpi',
            kpiId,
          });
          nextTarget = newId;
          nextDir = 'bottom';
        }
      }
      setKpiPickerAnchor(null);
    },
    [kpiPickerAnchor, addCard],
  );

  // Edit-mode is exclusive: opening the plot drawer closes any
  // active map-card edit (and vice versa) so at most one card wears
  // the purple `editing` stroke at a time.
  const openDrawer = useCallback((config) => {
    setDrawer(config);
    setActiveMapCardId(null);
    setActiveMapColumnIndex(null);
  }, []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const openMapBottom = useCallback((cardId, columnIndex = null) => {
    setActiveMapCardId(cardId ?? null);
    setActiveMapColumnIndex(cardId ? columnIndex : null);
    setDrawer(null);
  }, []);
  const closeMapBottom = useCallback(() => {
    setActiveMapCardId(null);
    setActiveMapColumnIndex(null);
  }, []);

  // Close every editing surface (plot drawer + map-card bottom) on
  // two transitions: Enable Edit → off (snapshot mode), and any
  // canvas load (`loadVersion` bumps) so chrome from the previous
  // canvas doesn't linger over the new one. Subscribed directly
  // instead of via a selector useEffect so the page doesn't
  // re-render on every store tick.
  useEffect(() => {
    const closeAll = () => {
      setDrawer(null);
      setActiveMapCardId(null);
      setActiveMapColumnIndex(null);
    };
    return useCanvasStore.subscribe((state, prev) => {
      if (!state.enableEdit && prev.enableEdit) closeAll();
      else if (state.loadVersion !== prev.loadVersion) closeAll();
    });
  }, []);

  const handleDrawerSave = useCallback(
    (plotConfig) => {
      drawer?.onSave?.(plotConfig);
      setDrawer(null);
    },
    [drawer],
  );

  const plotToolOpen = drawer != null;
  const mapBottomOpen = activeMapCardId != null;
  const bottomOpen = plotToolOpen || mapBottomOpen;
  // Show the bottom card's close button only when the bottom is
  // open *for a map card* — the plot-tool drawer has its own close,
  // and closing the drawer already collapses the bottom row.
  const showBottomClose = mapBottomOpen && !plotToolOpen;

  // `(project, scenarioName)` for the column whose card opened the
  // bottom form. Forwarded into BottomCard so its choice/range
  // fetches scope to that column instead of the project store.
  const mapBottomScenarioOverride = useMemo(() => {
    if (activeMapColumnIndex == null) return null;
    const col = columns?.[activeMapColumnIndex];
    if (!project || !col?.scenario) return null;
    return { project, scenarioName: col.scenario };
  }, [activeMapColumnIndex, columns, project]);

  return (
    <div
      style={{
        ...pageGridStyle,
        gridTemplateColumns: plotToolOpen
          ? `1fr ${PLOT_TOOL_WIDTH}px`
          : '1fr 0px',
        // `auto` sizes the bottom row to its form's height while
        // open; 0 when closed so the canvas reclaims the space.
        gridTemplateRows: bottomOpen
          ? `${NAV_HEIGHT}px 1fr auto`
          : `${NAV_HEIGHT}px 1fr 0px`,
      }}
    >
      <div style={navCellStyle}>
        <NavigatorCard />
      </div>

      <div style={canvasCellStyle}>
        {/* Empty entry state renders nothing in the canvas cell —
            the pulsing dashboard switcher / Import button in the
            navigator are the user's cue to act. */}
        {canvasName &&
          (view === 'launch' ? (
            <LaunchView
              onOpenDrawer={openDrawer}
              onOpenMapBottom={openMapBottom}
              onOpenKpiPicker={openKpiPicker}
              editingPlotCardId={drawer?.cardId ?? null}
              activeMapCardId={activeMapCardId}
            />
          ) : (
            <ComparisonView
              onOpenDrawer={openDrawer}
              onOpenMapBottom={openMapBottom}
              onOpenKpiPicker={openKpiPicker}
              editingPlotCardId={drawer?.cardId ?? null}
              // The originating column for an active plot edit. Used
              // by ComparisonView to paint the editing purple
              // stroke on *only* that column rather than every
              // column showing the same card id.
              editingColumnIndex={drawer?.columnIndex ?? null}
              activeMapCardId={activeMapCardId}
              // Same per-column scoping for map-card edits — the
              // card id is shared across mirrors, so without the
              // column filter every mirror would light up purple.
              activeMapColumnIndex={activeMapColumnIndex}
            />
          ))}
      </div>

      <div style={bottomCellStyle}>
        {bottomOpen && (
          <BottomCard
            activeMapCardId={activeMapCardId}
            activeMapColumnIndex={activeMapColumnIndex}
            scenarioOverride={mapBottomScenarioOverride}
            showClose={showBottomClose}
            onClose={closeMapBottom}
          />
        )}
      </div>

      {/* Plot tool column. Always rendered so the slide-in transition
          can play; visibility + interactivity are controlled by the
          `open` prop on PlotEditModal itself. */}
      <div style={plotToolCellStyle}>
        <PlotEditModal
          open={plotToolOpen}
          plotConfig={drawer?.plotConfig || null}
          onSave={handleDrawerSave}
          onCancel={closeDrawer}
          // Compare-mode per-column edit: ComparisonView attaches
          // a `{ project, scenarioName }` to the drawer config so
          // the form fetches its parameter schema (and choice
          // generators) against the column's scenario instead of
          // whichever scenario is currently active in the project
          // store. `null` outside compare mode → form falls
          // through to project-store values.
          scenarioOverride={drawer?.scenarioOverride || null}
          // Parameter names to render disabled in the form — for
          // callers that pre-fix a parameter and want it locked.
          extraReadonlyFields={drawer?.extraReadonlyFields}
          // Back returns to the PlotChoices picker. Hidden when a
          // `cardId` is set (Edit / "Add a plot" pill flows — Back
          // would let the user swap plot types and turn the
          // operation into something else) or when the caller
          // explicitly opts out via `allowBack: false`.
          allowBack={drawer?.allowBack !== false && !drawer?.cardId}
        />
      </div>

      {/* KPI picker — page-level singleton. Opens via the
          perimeter `+` KPI pill on any column / launch view; the
          anchor captured at open time gets replayed against
          `addCard` on confirm. `initialFeature` (when set by the
          feature-focus landing) pre-expands the matching group;
          omitted when the perimeter `+` is the trigger. */}
      <KpiPicker
        open={kpiPickerAnchor !== null}
        onCancel={closeKpiPicker}
        onConfirm={handleKpiPickerConfirm}
        initialFeature={kpiPickerAnchor?.initialFeature ?? null}
      />
    </div>
  );
};

const PLOT_TOOL_WIDTH = 480;
const NAV_HEIGHT = 52;

// Rows + columns are set inline on the wrapper above so they can
// animate in step with the drawer open/close.
const pageGridStyle = {
  display: 'grid',
  gridTemplateAreas: `
    "nav tool"
    "canvas tool"
    "bottom tool"
  `,
  gap: 12,
  padding: 20,
  height: '100%',
  boxSizing: 'border-box',
  transition:
    'grid-template-columns 0.3s cubic-bezier(0.22, 0.61, 0.36, 1), grid-template-rows 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
};

const navCellStyle = {
  gridArea: 'nav',
  minWidth: 0,
};

const canvasCellStyle = {
  gridArea: 'canvas',
  minWidth: 0,
  overflow: 'auto',
};

const bottomCellStyle = {
  gridArea: 'bottom',
  minWidth: 0,
};

const plotToolCellStyle = {
  gridArea: 'tool',
  minWidth: 0,
  position: 'relative',
};

export default CanvasPage;

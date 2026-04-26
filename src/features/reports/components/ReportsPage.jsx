import { useCallback, useEffect, useState } from 'react';

import { useReportsStore } from '../stores/reportsStore';
import NavigatorCard from './NavigatorCard';
import BottomCard from './BottomCard';
import LaunchView from './LaunchView';
import ComparisonView from './ComparisonView';
import PlotEditModal from './PlotEditModal';

/**
 * Reports Mode — root page. 2-column grid:
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
const ReportsPage = () => {
  const view = useReportsStore((s) => s.view);

  // drawer = { plotConfig, onSave, cardId? } | null
  // `cardId` (when present) flags the FeatureCardPlot that owns the
  // plot being edited so it can paint its `editing` purple stroke.
  // Adding a brand-new card via the picker leaves it undefined.
  const [drawer, setDrawer] = useState(null);
  // id of the `FeatureCardMap` whose store the bottom form drives;
  // `null` when no map card is being edited.
  const [activeMapCardId, setActiveMapCardId] = useState(null);

  // Edit-mode is exclusive: opening the plot drawer closes any
  // active map-card edit (and vice versa) so at most one card wears
  // the purple `editing` stroke at a time.
  const openDrawer = useCallback((config) => {
    setDrawer(config);
    setActiveMapCardId(null);
  }, []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const openMapBottom = useCallback((cardId) => {
    setActiveMapCardId(cardId ?? null);
    setDrawer(null);
  }, []);
  const closeMapBottom = useCallback(() => setActiveMapCardId(null), []);

  // Entering export view shuts any open editing surface — the plot
  // drawer and the map-card bottom both belong to the editing mode.
  // Subscribed via zustand directly (rather than `useEffect` on a
  // selector) so the close action fires once at the moment of the
  // false → true transition, instead of triggering a cascading
  // render every time the page consumes the slice.
  useEffect(
    () =>
      useReportsStore.subscribe((state, prev) => {
        if (state.exportMode && !prev.exportMode) {
          setDrawer(null);
          setActiveMapCardId(null);
        }
      }),
    [],
  );

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
        {view === 'launch' ? (
          <LaunchView
            onOpenDrawer={openDrawer}
            onOpenMapBottom={openMapBottom}
            editingPlotCardId={drawer?.cardId ?? null}
            activeMapCardId={activeMapCardId}
          />
        ) : (
          <ComparisonView
            onOpenDrawer={openDrawer}
            onOpenMapBottom={openMapBottom}
            editingPlotCardId={drawer?.cardId ?? null}
            activeMapCardId={activeMapCardId}
          />
        )}
      </div>

      <div style={bottomCellStyle}>
        {bottomOpen && (
          <BottomCard
            activeMapCardId={activeMapCardId}
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
        />
      </div>
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

export default ReportsPage;

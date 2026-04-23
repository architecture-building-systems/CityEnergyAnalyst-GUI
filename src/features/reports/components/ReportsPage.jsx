import { useCallback, useState } from 'react';

import { useReportsStore } from '../stores/reportsStore';
import NavigatorCard from './NavigatorCard';
import BottomCard from './BottomCard';
import LaunchView from './LaunchView';
import ComparisonView from './ComparisonView';
import PlotEditModal from './PlotEditModal';

/**
 * Reports Mode — root page component.
 *
 * Layout is a 2-column grid with three rows in the left column:
 *   ┌──────────────────────┬──────────────┐
 *   │      Navigator       │              │
 *   ├──────────────────────┤              │
 *   │                      │   Plot tool  │
 *   │       Canvas         │              │
 *   │                      │              │
 *   ├──────────────────────┤              │
 *   │       Bottom         │              │
 *   └──────────────────────┴──────────────┘
 *
 * - Left column stacks navigator (top, fixed height), canvas
 *   (middle, fills remaining space), and a bottom card anchored
 *   to the viewport bottom.
 * - Right column holds the plot tool card and spans all three
 *   rows. When the plot tool is closed the right column collapses
 *   to 0 and the canvas fills the full width. Animating
 *   `grid-template-columns` provides the push effect.
 *
 * Drawer state lives here so the tool column can render at this
 * level (not buried inside a view). Views call `openDrawer` with
 * an `onSave` closure that captures their local state, so the
 * page doesn't need to know which view owns what.
 */
const ReportsPage = () => {
  const view = useReportsStore((s) => s.view);

  const [drawer, setDrawer] = useState(null);
  // drawer = { mode, scenario, plotConfig, onSave } | null

  const openDrawer = useCallback((config) => setDrawer(config), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const handleDrawerSave = useCallback(
    (plotConfig) => {
      drawer?.onSave?.(plotConfig);
      setDrawer(null);
    },
    [drawer],
  );

  const plotToolOpen = drawer != null;

  return (
    <div
      style={{
        ...pageGridStyle,
        gridTemplateColumns: plotToolOpen
          ? `1fr ${PLOT_TOOL_WIDTH}px`
          : '1fr 0px',
        // Bottom row hosts the map-layer properties card, shown only
        // while a plot is being edited (drawer open). `auto` lets the
        // form size to its content (form height varies by layer type).
        // Collapses to 0 when the drawer closes so the canvas
        // reclaims the vertical space.
        gridTemplateRows: plotToolOpen
          ? `${NAV_HEIGHT}px 1fr auto`
          : `${NAV_HEIGHT}px 1fr 0px`,
      }}
    >
      <div style={navCellStyle}>
        <NavigatorCard />
      </div>

      <div style={canvasCellStyle}>
        {view === 'launch' ? (
          <LaunchView onOpenDrawer={openDrawer} />
        ) : (
          <ComparisonView onOpenDrawer={openDrawer} />
        )}
      </div>

      <div style={bottomCellStyle}>
        {plotToolOpen && <BottomCard />}
      </div>

      {/* Plot tool column. Always rendered so the slide-in transition
          can play; visibility + interactivity are controlled by the
          `open` prop on PlotEditModal itself. */}
      <div style={plotToolCellStyle}>
        <PlotEditModal
          open={plotToolOpen}
          mode={drawer?.mode || 'add'}
          scenario={drawer?.scenario}
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

const pageGridStyle = {
  display: 'grid',
  // Rows are set inline on the wrapper so the bottom row can animate
  // between 0 and BOTTOM_HEIGHT in step with the drawer open/close.
  gridTemplateAreas: `
    "nav tool"
    "canvas tool"
    "bottom tool"
  `,
  gap: 12,
  padding: 20,
  height: '100%',
  boxSizing: 'border-box',
  // Smoothly slide both the plot tool column AND the bottom row in/out
  // when the drawer opens or closes.
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
  // Canvas expands freely right & down; overflow lets oversized
  // canvas content scroll instead of breaking the grid.
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

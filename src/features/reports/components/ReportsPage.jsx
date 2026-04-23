import { useCallback, useState } from 'react';

import { useReportsStore } from '../stores/reportsStore';
import NavigatorCard from './NavigatorCard';
import LaunchView from './LaunchView';
import ComparisonView from './ComparisonView';
import PlotEditModal from './PlotEditModal';

/**
 * Reports Mode — root page component.
 *
 * Layout is a 2-column grid:
 *   ┌──────────────────────┬──────────────┐
 *   │      Navigator       │              │
 *   ├──────────────────────┤   Plot tool  │
 *   │                      │              │
 *   │       Canvas         │              │
 *   │                      │              │
 *   └──────────────────────┴──────────────┘
 *
 * - Left column stacks navigator (top, fixed height) and canvas
 *   (bottom, fills remaining space).
 * - Right column holds the plot tool card and spans both rows.
 * - When the plot tool is closed the right column collapses to 0
 *   and the canvas fills the full width. Animating the grid
 *   template column provides the "push" effect.
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
  gridTemplateRows: `${NAV_HEIGHT}px 1fr`,
  gridTemplateAreas: `
    "nav tool"
    "canvas tool"
  `,
  gap: 12,
  padding: 20,
  height: '100%',
  boxSizing: 'border-box',
  // Smoothly slide the plot tool column in/out when the drawer opens
  // or closes.
  transition: 'grid-template-columns 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
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

const plotToolCellStyle = {
  gridArea: 'tool',
  minWidth: 0,
  position: 'relative',
};

export default ReportsPage;

import { useCallback, useState } from 'react';

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
 */
const ReportsPage = () => {
  const view = useReportsStore((s) => s.view);

  // drawer = { plotConfig, onSave } | null
  const [drawer, setDrawer] = useState(null);

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
        // Bottom row hosts the map-layer properties card while a
        // plot is being edited. `auto` sizes to its form's height;
        // 0 when closed so the canvas reclaims the space.
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

      <div style={bottomCellStyle}>{plotToolOpen && <BottomCard />}</div>

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

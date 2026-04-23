import { useEffect } from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import DeckGLMap from 'features/map/components/Map/Map';
import MapControls from 'features/map/components/Map/MapControls';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { useMapStore } from 'features/map/stores/mapStore';

import './ReportMap.css';

/**
 * Map card used by the Reports comparison grid.
 *
 * Mirrors `features/project/components/InputMap.jsx` in structure,
 * but pins the data bundle to an explicit `scenario` instead of
 * reading the dashboard's active scenario. This is what lets
 * inter-scenario mode render a different scenario per column.
 *
 * Layer visibility / colour mode still live on the shared
 * `useMapStore` singleton — toggles in a Reports column leak to
 * sibling columns and the main viewport. This matches the Path-C
 * tradeoff already accepted for `MapLayerPropertiesCard` in
 * Reports; keeping it consistent is preferable to forking the
 * store just for this surface.
 *
 * `interactive={false}` gates the `DeckGLMap` click handlers so a
 * building click in Reports never writes into `inputEditorStore` /
 * `buildingSelectionStore` (both singletons that would otherwise
 * cross-wire scenarios). Hover tooltips still work.
 */
const ReportMap = ({ project, scenario }) => {
  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);

  const { data, isFetching, isError, refetch } = useInputs(
    scenario ? { scenario, project } : undefined,
  );
  const { geojsons, colors } = data ?? {};

  // `useInputs` is configured with `initialData: {}` +
  // `refetchOnMount: false` so the main viewport doesn't over-fetch.
  // That combo also means the query never fires on fresh mount —
  // `InputMap` works around it by calling `refetch()` explicitly in
  // an effect, and this component has to do the same or the map
  // renders empty. Also recentre on scenario changes for parity.
  useEffect(() => {
    refetch();
    resetCameraOptions();
  }, [project, scenario, refetch, resetCameraOptions]);

  return (
    <div style={wrapperStyle} onContextMenu={(e) => e.preventDefault()}>
      {isFetching && (
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
          tip={isError ? 'Retrying…' : 'Loading map'}
        >
          <div style={overlayStyle} />
        </Spin>
      )}
      <DeckGLMap data={geojsons} colors={colors} interactive={false} />
      <div className="cea-report-map-controls" style={controlsFrameStyle}>
        <MapControls scenario={scenario} />
      </div>
    </div>
  );
};

const wrapperStyle = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
  borderRadius: 8,
};

const overlayStyle = {
  position: 'absolute',
  inset: 0,
};

// Overlay the shared `<MapControls>` toolbar on top of the map.
// Chrome mirrors the plot-section trio frame (HomePage.css
// `.cea-card-icon-button-container` — 12px radius, 1px #ddd
// outline, 3px padding) so the map toolbar and plot-section
// toolbars read as one family inside the Reports card.
const controlsFrameStyle = {
  position: 'absolute',
  top: 8,
  left: 8,
  zIndex: 2,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  borderRadius: 12,
  outline: '1px solid #dddddd',
  padding: 3,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  fontSize: 12,
};

export default ReportMap;

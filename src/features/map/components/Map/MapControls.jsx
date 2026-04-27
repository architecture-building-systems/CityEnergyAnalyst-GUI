import { Tooltip } from 'antd';
import { useMapStore } from 'features/map/stores/mapStore';
import { CameraView, Compass, ExtrudeIcon } from 'assets/icons';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import LayerToggle from './LayerToggle';

const ExtrudeButton = () => {
  const extruded = useMapStore((state) => state.extruded);
  const setExtruded = useMapStore((state) => state.setExtruded);

  const toggleExtruded = () => {
    setExtruded(!extruded);
  };

  return (
    <Tooltip title="Toggle 3D" styles={{ body: { fontSize: 12 } }}>
      <div className="cea-card-toolbar-icon no-hover-color">
        <ExtrudeIcon onClick={toggleExtruded} />
      </div>
    </Tooltip>
  );
};

const ResetCameraButton = () => {
  const updateViewState = useMapStore((state) => state.updateViewState);
  const cameraOptions = useMapStore((state) => state.cameraOptions);
  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);

  // Reset via `useCameraFitBounds`: nulling `cameraOptions` flips
  // `cameraOptionsCalculated` from true → false, which unblocks the
  // bounds effect inside `DeckGLMap` and triggers a fresh
  // `cameraForBounds` recompute + FlyTo transition against the
  // currently-rendered zone. This is robust whether `cameraOptions`
  // was populated or had been nulled by a sibling map (Canvas Builder
  // comparison view shares the singleton). Immediate pitch reset
  // gives the click instant feedback even while the bounds effect
  // is racing.
  const resetCamera = () => {
    if (cameraOptions) {
      updateViewState({
        pitch: 0,
        zoom: cameraOptions.zoom,
        bearing: cameraOptions.bearing,
        latitude: cameraOptions.center.lat,
        longitude: cameraOptions.center.lng,
      });
    } else {
      updateViewState({ pitch: 0 });
    }
    resetCameraOptions();
  };
  return (
    <Tooltip title="Reset Camera" styles={{ body: { fontSize: 12 } }}>
      <div className="cea-card-toolbar-icon no-hover-color">
        <CameraView onClick={resetCamera} />
      </div>
    </Tooltip>
  );
};

const ResetCompassButton = () => {
  const bearings = useMapStore((state) => state.viewState?.bearing ?? 0);
  const updateViewState = useMapStore((state) => state.updateViewState);

  const resetCompass = () => {
    updateViewState({
      bearing: 0,
    });
  };

  return (
    <Tooltip title="Reset Compass" styles={{ body: { fontSize: 12 } }}>
      <div className="cea-card-toolbar-icon no-hover-color">
        <Compass
          style={{
            transform: `rotate(${-bearings}deg)`,
          }}
          onClick={resetCompass}
        />
      </div>
    </Tooltip>
  );
};

/**
 * Map controls toolbar.
 *
 * `scenario` (optional) — when provided, `LayerToggle` and the
 * inputs query are scoped to that scenario instead of the active
 * one. Used by the canvas so each column's map toolbar reads its own
 * scenario's geometry bundle. Main viewport passes nothing and
 * behaves exactly as before.
 */
const MapControls = ({ scenario }) => {
  const inputsOpts = scenario ? { scenario } : undefined;
  const { data: inputData } = useInputs(inputsOpts);
  const { geojsons: data } = inputData;

  return (
    <div id="map-controls">
      {data?.zone && (
        <>
          <LayerToggle scenario={scenario} />
          <ExtrudeButton />
          <ResetCameraButton />
        </>
      )}
      <ResetCompassButton />
    </div>
  );
};

export default MapControls;

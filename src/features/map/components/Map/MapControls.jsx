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

  const resetCamera = () => {
    updateViewState({
      pitch: 0,
      zoom: cameraOptions.zoom,
      bearing: cameraOptions.bearing,
      latitude: cameraOptions.center.lat,
      longitude: cameraOptions.center.lng,
    });
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

const MapControls = () => {
  const { data: inputData } = useInputs();
  const { geojsons: data } = inputData;

  return (
    <div id="map-controls">
      {data?.zone && (
        <>
          <LayerToggle />
          <ExtrudeButton />
          <ResetCameraButton />
        </>
      )}
      <ResetCompassButton />
    </div>
  );
};

export default MapControls;

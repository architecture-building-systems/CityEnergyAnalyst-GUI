import { useEffect } from 'react';
import { Tooltip, Switch, Popover } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import { useMapStore, COLOR_MODES } from 'features/map/stores/mapStore';
import { CameraView, Compass, ExtrudeIcon } from 'assets/icons';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import LayerToggle from './LayerToggle';
import { generateConstructionColorMap } from 'features/map/utils/constructionColors';

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

/**
 * Toggle button for construction standard building coloring
 */
const ConstructionStandardToggle = ({ data }) => {
  const colorMode = useMapStore((state) => state.colorMode);
  const setColorMode = useMapStore((state) => state.setColorMode);
  const setConstructionColorMap = useMapStore(
    (state) => state.setConstructionColorMap,
  );

  const isEnabled = colorMode === COLOR_MODES.CONSTRUCTION_STANDARD;

  // Initialize color map when data changes
  useEffect(() => {
    if (data?.zone?.features) {
      const colorMap = generateConstructionColorMap(data.zone.features);
      setConstructionColorMap(colorMap);
    }
  }, [data?.zone?.features, setConstructionColorMap]);

  const handleToggle = (checked) => {
    setColorMode(
      checked ? COLOR_MODES.CONSTRUCTION_STANDARD : COLOR_MODES.DEFAULT,
    );
  };

  const popoverContent = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>Color by construction standard</span>
      <Switch checked={isEnabled} onChange={handleToggle} size="small" />
    </div>
  );

  return (
    <Popover content={popoverContent} trigger="click" placement="left">
      <Tooltip title="Building Colors" styles={{ body: { fontSize: 12 } }}>
        <div
          className="cea-card-toolbar-icon no-hover-color"
          style={{
            color: isEnabled ? '#1890ff' : undefined,
          }}
        >
          <BgColorsOutlined style={{ fontSize: 18 }} />
        </div>
      </Tooltip>
    </Popover>
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
          <ConstructionStandardToggle data={data} />
          <ExtrudeButton />
          <ResetCameraButton />
        </>
      )}
      <ResetCompassButton />
    </div>
  );
};

export default MapControls;

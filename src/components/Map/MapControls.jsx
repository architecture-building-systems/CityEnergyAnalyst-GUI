import { Button, Switch } from 'antd';

const MapControls = () => {
  return (
    <div id="map-controls">
      <div style={{ display: 'flex', gap: 8 }}>
        <Switch
          size="small"
          checked={extruded}
          onChange={(checked) => {
            setExtruded(checked);
          }}
        />
        Show 3D
      </div>
      <Button
        style={{ fontSize: 12 }}
        type="primary"
        size="small"
        block
        onClick={() => {
          setViewState((state) => ({
            ...state,
            pitch: 0,
            zoom: cameraOptions.current.zoom,
            bearing: cameraOptions.current.bearing,
            latitude: cameraOptions.current.center.lat,
            longitude: cameraOptions.current.center.lng,
          }));
        }}
      >
        Reset Camera
      </Button>
      <Button
        style={{ fontSize: 12 }}
        type="primary"
        size="small"
        block
        onClick={() => {
          setViewState((state) => ({
            ...state,
            bearing: 0,
          }));
        }}
      >
        Reset Compass
      </Button>
    </div>
  );
};

export default MapControls;

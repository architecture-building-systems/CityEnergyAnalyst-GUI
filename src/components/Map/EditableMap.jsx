import { useState, useEffect, useCallback, useRef } from 'react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import positron from '../../constants/mapStyles/positron.json';
import {
  EditableGeoJsonLayer,
  DrawPolygonMode,
  ModifyMode,
  ViewMode,
} from '@deck.gl-community/editable-layers';
import { Button, Input } from 'antd';
import './EditableMap.css';
import { DeckGL } from '@deck.gl/react';
import { FlyToInterpolator, GeoJsonLayer } from 'deck.gl';
import { EXAMPLE_CITIES } from '../Project/CreateScenarioForms/constants';
import {
  useCameraForBounds,
  useGeocodeLocation,
  useFetchBuildings,
} from './hooks';
import { calcBoundsAndCenter, EMPTY_FEATURE } from './utils';

const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0,
};

const LocationSearchBar = ({ onLocationResult }) => {
  const randomCity = useRef(
    EXAMPLE_CITIES[Math.floor(Math.random() * EXAMPLE_CITIES.length)],
  );

  const { locationAddress, searchAddress, loading } =
    useGeocodeLocation(onLocationResult);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      Search for a location
      <Input.Search
        placeholder={`Example: type "${randomCity.current}”`}
        allowClear
        loading={loading}
        onSearch={searchAddress}
      />
      {loading ? (
        <small>Searching...</small>
      ) : locationAddress instanceof Error ? (
        <small style={{ color: 'red', fontStyle: 'italic' }}>
          Location not found
        </small>
      ) : (
        locationAddress && (
          <small>
            <i>Found location: {locationAddress?.display_name || 'Unknown'}</i>
          </small>
        )
      )}
    </div>
  );
};

const drawModes = {
  draw: 'Draw',
  edit: 'Edit',
  view: null,
};

const modeLayers = {
  [drawModes.draw]: DrawPolygonMode,
  [drawModes.edit]: ModifyMode,
  [drawModes.view]: ViewMode,
};

const DrawModeInterface = ({
  mode,
  onModeChange,

  buildings,
  polygon,

  onFetchedBuildings,
  onLocationResult,

  onDelete,
}) => {
  const { fetchBuildings, fetching, error } =
    useFetchBuildings(onFetchedBuildings); // Store fetched buildings in parent context

  useEffect(() => {
    // Only fetch buildings if in view mode and buildings are not already loaded
    mode == drawModes.view &&
      !buildings?.features?.length &&
      polygon?.features?.length &&
      fetchBuildings(polygon);
  }, [mode, polygon, fetchBuildings, buildings?.features?.length]);

  return (
    <>
      <div
        id="edit-map-search-bar"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: 12,
          zIndex: 5,
          width: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 10,
        }}
      >
        <LocationSearchBar onLocationResult={onLocationResult} />

        {fetching ? (
          <b>Fetching buildings...</b>
        ) : error ? (
          <b>Error fetching buildings</b>
        ) : buildings?.features?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <b>Buildings found: {buildings?.features?.length || 0}</b>
            </div>
            <small>
              <i>
                Note: The number of buildings may be different after
                postprocessing.
              </i>
            </small>
          </div>
        ) : null}
      </div>

      <div id="edit-map-buttons">
        {polygon?.features?.length && !fetching ? (
          <>
            <Button
              type={mode == drawModes.edit ? 'primary' : 'default'}
              onClick={() => {
                onModeChange(
                  mode == drawModes.edit ? drawModes.view : drawModes.edit,
                );
                if (mode == drawModes.edit) fetchBuildings(polygon);
              }}
            >
              {mode == drawModes.edit ? 'Done' : 'Edit'}
            </Button>
            <Button type="primary" onClick={onDelete} danger>
              Delete
            </Button>
          </>
        ) : (
          <Button
            type={mode === drawModes.draw ? 'primary' : 'default'}
            onClick={() => onModeChange(drawModes.draw)}
            loading={fetching}
          >
            Draw
          </Button>
        )}
      </div>
    </>
  );
};

const EditableMap = ({
  initialValues,

  viewState,
  onViewStateChange,

  controller,

  onMapLoad,

  onPolygonChange,

  buildings,
  onFetchedBuildings,

  drawingMode = false,
}) => {
  const mapRef = useRef();

  const handleViewStateChange = useCallback(
    ({ viewState }) => {
      onViewStateChange?.(viewState);
    },
    [onViewStateChange],
  );

  const { setLocation } = useCameraForBounds(
    mapRef,
    ({ cameraOptions, location }) => {
      onViewStateChange({
        latitude: location.latitude,
        longitude: location.longitude,
        zoom: cameraOptions.zoom,
        transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
        transitionDuration: 1000,
      });

      // Trigger a refresh so that map is zoomed correctly
      mapRef.current.zoomTo(cameraOptions.zoom);
    },
  );

  const [mode, setMode] = useState(drawModes.view);
  const [data, setData] = useState(initialValues?.polygon || EMPTY_FEATURE);
  const triggerDataChange = useCallback(
    (data) => {
      setData(data);
      onPolygonChange?.(data);
    },
    [onPolygonChange],
  );

  const [fetchedBuildings, setFetchedBuildings] = useState(
    initialValues?.fetchedBuildings,
  );
  const handleFetchedBuildingsChange = useCallback(
    (data) => {
      setFetchedBuildings(data);
      onFetchedBuildings?.(data);
    },
    [onFetchedBuildings],
  );

  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);

  const editableLayer = new EditableGeoJsonLayer({
    id: 'editable-layer',
    data: data,
    mode: modeLayers[mode],
    selectedFeatureIndexes: selectedFeatureIndexes,

    onEdit: (e) => {
      if (e.editType === 'addFeature') {
        triggerDataChange(e.updatedData);
        setMode(drawModes.view);
      } else if (
        ['removePosition', 'movePosition', 'addPosition'].includes(e.editType)
      ) {
        triggerDataChange(e.updatedData);
      }
    },

    visible: drawingMode,
  });

  const fetchedBuildingsLayer = new GeoJsonLayer({
    id: 'fetched-buildings-layer',
    data: fetchedBuildings?.features ? fetchedBuildings : EMPTY_FEATURE,
    getFillColor: [255, 255, 255],
    getLineColor: [0, 0, 0],
    getLineWidth: 1,

    visible: drawingMode,
  });

  const zoneBuildingsLayer = new GeoJsonLayer({
    id: 'zone-buildings-layer',
    data: buildings?.features ? buildings : EMPTY_FEATURE,
    getFillColor: [255, 255, 255],
    getLineColor: [0, 0, 0],
    getLineWidth: 1,

    visible: !drawingMode,
  });

  const clearGeometries = () => {
    // Remove polygon
    triggerDataChange(EMPTY_FEATURE);
    // Remove buildings
    handleFetchedBuildingsChange(EMPTY_FEATURE);
    setSelectedFeatureIndexes([]);
  };

  useEffect(() => {
    if (mode === drawModes.draw) triggerDataChange(EMPTY_FEATURE);
    else if (mode === drawModes.edit) setSelectedFeatureIndexes([0]);
    // view mode
    else setSelectedFeatureIndexes([]);
  }, [mode]);

  useEffect(() => {
    if (drawingMode && fetchedBuildings?.features?.length)
      setLocation(calcBoundsAndCenter(fetchedBuildings));
  }, [drawingMode]);

  return (
    <>
      {drawingMode && (
        <DrawModeInterface
          mode={mode}
          buildings={fetchedBuildings}
          polygon={data}
          onFetchedBuildings={handleFetchedBuildingsChange}
          onLocationResult={setLocation}
          onModeChange={setMode}
          onDelete={clearGeometries}
        />
      )}

      <div onContextMenu={(e) => e.preventDefault()}>
        <DeckGL
          viewState={viewState || defaultViewState}
          controller={
            controller ? { dragRotate: false, doubleClickZoom: false } : false
          }
          layers={[editableLayer, fetchedBuildingsLayer, zoneBuildingsLayer]}
          onViewStateChange={handleViewStateChange}
        >
          <Map
            mapStyle={positron}
            onLoad={(e) => {
              const mapbox = e.target;
              // Store the map instance in the ref
              mapRef.current = mapbox;

              onMapLoad?.(e);
            }}
          />
        </DeckGL>
      </div>
    </>
  );
};

export default EditableMap;

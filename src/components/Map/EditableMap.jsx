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
import { GeoJsonLayer } from 'deck.gl';
import { EXAMPLE_CITIES } from '../Project/CreateScenarioForms/constants';
import {
  useCameraForBounds,
  useGeocodeLocation,
  useFetchBuildings,
} from './hooks';
import { EMPTY_FEATURE } from './utils';

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
      <i>Search for a location</i>
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

const DrawModeInterface = ({
  mode,

  buildings,
  polygon,

  onFetchedBuildings,
  onLocationResult,

  onDraw,
  onEdit,
  onDelete,
}) => {
  const { fetchBuildings, fetching, error } =
    useFetchBuildings(onFetchedBuildings); // Store fetched buildings in parent context

  useEffect(() => {
    // Only fetch buildings if in drawMode and not editing
    mode == null && polygon?.features?.length && fetchBuildings(polygon); // Set polygon to null if in view mode
  }, [mode, polygon, fetchBuildings]);

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
                The number of buildings may be different after postprocessing.
              </i>
            </small>
          </div>
        ) : null}
      </div>

      <div id="edit-map-buttons">
        {polygon?.features?.length ? (
          <>
            <Button
              type={mode === 'edit' ? 'primary' : 'default'}
              onClick={onEdit}
            >
              Edit
            </Button>
            <Button type="primary" onClick={onDelete} danger>
              Delete
            </Button>
          </>
        ) : (
          <Button
            type={mode === 'draw' ? 'primary' : 'default'}
            onClick={onDraw}
          >
            Draw
          </Button>
        )}
      </div>
    </>
  );
};

const EditableMap = ({
  viewState,
  onViewStateChange,

  onMapLoad,

  polygon,
  onPolygonChange,

  buildings,
  onFetchedBuildings,

  drawingMode = false,
}) => {
  const mapRef = useRef();

  const handleViewStateChange = useCallback(({ viewState }) => {
    onViewStateChange?.(viewState);
  }, []);

  const { setLocation } = useCameraForBounds(
    mapRef,
    ({ cameraOptions, location }) => {
      onViewStateChange({
        latitude: location.latitude,
        longitude: location.longitude,
        zoom: cameraOptions.zoom,
      });

      // Trigger a refresh so that map is zoomed correctly
      mapRef.current.zoomTo(cameraOptions.zoom);
    },
  );

  const [mode, setMode] = useState(null);
  const [data, setData] = useState(polygon || EMPTY_FEATURE);
  const triggerDataChange = useCallback((data) => {
    setData(data);
    onPolygonChange?.(data);
  }, []);

  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);

  const editableLayer = new EditableGeoJsonLayer({
    id: 'editable-layer',
    data: polygon?.features ? polygon : data || EMPTY_FEATURE,
    mode:
      mode === 'draw'
        ? DrawPolygonMode
        : mode === 'edit'
          ? ModifyMode
          : ViewMode,
    selectedFeatureIndexes: selectedFeatureIndexes,

    onEdit: (e) => {
      if (e.editType === 'addFeature') {
        triggerDataChange(e.updatedData);
        setMode(null);
      } else if (
        ['removePosition', 'movePosition', 'addPosition'].includes(e.editType)
      ) {
        triggerDataChange(e.updatedData);
      }
    },

    visible: drawingMode,
  });

  const previewBuildingsLayer = new GeoJsonLayer({
    id: 'preview-buildings-layer',
    data: buildings?.features ? buildings : EMPTY_FEATURE,
    getFillColor: [255, 255, 255],
    getLineColor: [0, 0, 0],
    getLineWidth: 1,
  });

  const toggleDraw = () => {
    if (mode !== 'draw') {
      setMode('draw');
    } else {
      setMode(null);
    }
  };

  const toggleEdit = () => {
    if (mode !== 'edit') {
      setMode('edit');
    } else {
      setMode(null);
    }
  };

  const clearGeometries = () => {
    // Remove polygon
    triggerDataChange(null);
    // Remove buildings
    onFetchedBuildings(null);
    setSelectedFeatureIndexes([]);
  };

  useEffect(() => {
    if (mode === 'draw') triggerDataChange(null);
    else if (mode === 'edit') setSelectedFeatureIndexes([0]);
    // view mode
    else setSelectedFeatureIndexes([]);
  }, [mode]);

  useEffect(() => {
    if (drawingMode) setSelectedFeatureIndexes([]);
  }, [drawingMode]);

  return (
    <>
      {drawingMode && (
        <DrawModeInterface
          mode={mode}
          buildings={buildings}
          polygon={data}
          onFetchedBuildings={onFetchedBuildings}
          onLocationResult={setLocation}
          onDraw={toggleDraw}
          onDelete={clearGeometries}
          onEdit={toggleEdit}
        />
      )}

      <div onContextMenu={(e) => e.preventDefault()}>
        <DeckGL
          viewState={viewState || defaultViewState}
          controller={{ dragRotate: false, doubleClickZoom: false }}
          layers={[editableLayer, previewBuildingsLayer]}
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

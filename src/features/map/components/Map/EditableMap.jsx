import { useState, useEffect, useCallback, useRef } from 'react';

import positron from 'constants/mapStyles/positron.json';
import { Button } from 'antd';

import { GeoJsonLayer } from 'deck.gl';
import { MapboxOverlay } from '@deck.gl/mapbox';

import { useCameraForBounds, useFetchBuildings } from '../../hooks';
import { calcBoundsAndCenter, EMPTY_FEATURE } from './utils';

import { Map, useControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import LocationSearchBar from './LocationSearchBar';
import DrawControl, { DRAW_MODES } from './DrawControl';

import './EditableMap.css';

const DeckGLOverlay = (props) => {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
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
  const prevModeRef = useRef(null);

  const { fetchBuildings, fetching, error } =
    useFetchBuildings(onFetchedBuildings); // Store fetched buildings in parent context

  useEffect(() => {
    // Only fetch buildings if in view mode and buildings are not already loaded
    mode == DRAW_MODES.view &&
      !buildings?.features?.length &&
      polygon?.features?.length &&
      fetchBuildings(polygon);
  }, [mode, polygon, fetchBuildings, buildings?.features?.length]);

  useEffect(() => {
    if (prevModeRef.current !== mode) {
      if (prevModeRef.current === DRAW_MODES.edit && mode === DRAW_MODES.view)
        fetchBuildings(polygon);

      prevModeRef.current = mode;
    }
  }, [mode]);

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
              type={mode == DRAW_MODES.edit ? 'primary' : 'default'}
              onClick={() => {
                onModeChange(
                  mode == DRAW_MODES.edit ? DRAW_MODES.view : DRAW_MODES.edit,
                );
              }}
            >
              {mode == DRAW_MODES.edit ? 'Done' : 'Edit'}
            </Button>
            <Button type="primary" onClick={onDelete} danger>
              Delete
            </Button>
          </>
        ) : (
          <Button
            type={mode === DRAW_MODES.draw ? 'primary' : 'default'}
            onClick={() => onModeChange(DRAW_MODES.draw)}
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

  onMapLoad,

  onPolygonChange,

  buildings,
  onFetchedBuildings,

  drawingMode = false,
}) => {
  const mapRef = useRef();
  const drawRef = useRef(null);

  const { setLocation } = useCameraForBounds(
    mapRef,
    ({ cameraOptions, location }) => {
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: cameraOptions.zoom,
        speed: 8,
      });
    },
  );

  const handleViewStateChange = useCallback(
    ({ viewState }) => {
      onViewStateChange?.(viewState);
    },
    [onViewStateChange],
  );

  const [mode, setMode] = useState(DRAW_MODES.view);
  const [data, setData] = useState(initialValues?.polygon || EMPTY_FEATURE);

  const handleModeChange = (mode) => {
    console.log('handleModeChange:', mode);
    if (!drawRef.current || !mapRef.current) return;

    if (mode === DRAW_MODES.draw) {
      drawRef.current.changeMode(DRAW_MODES.draw);
    } else if (mode === DRAW_MODES.edit) {
      // Select the first feature if there is one
      const features = drawRef.current.getAll().features;
      if (features.length > 0) {
        drawRef.current.changeMode(DRAW_MODES.edit, {
          featureId: features[0].id,
        });
      }
    } else {
      drawRef.current.changeMode(DRAW_MODES.view);
    }

    setMode(mode);
  };

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

  // Handle draw events
  const handleDrawCreate = useCallback(
    (e) => {
      console.log('draw create:', e);
      const updatedData = {
        type: 'FeatureCollection',
        features: e.features,
      };
      triggerDataChange(updatedData);
    },
    [triggerDataChange, mode],
  );

  const handleDrawUpdate = useCallback(
    (e) => {
      console.log('draw update:', e);
      const updatedData = {
        type: 'FeatureCollection',
        features: e.features,
      };
      triggerDataChange(updatedData);
    },
    [triggerDataChange],
  );

  const handleDrawDelete = useCallback(() => {
    // Remove polygon
    triggerDataChange(EMPTY_FEATURE);
    // Remove buildings
    handleFetchedBuildingsChange(EMPTY_FEATURE);

    // Clear draw
    if (drawRef.current) {
      console.log('Clearing draw');
      drawRef.current.deleteAll();
    }
  }, [drawRef.current]);

  // Calculate bounds and center for fetched buildings
  useEffect(() => {
    if (drawingMode && fetchedBuildings?.features?.length)
      setLocation(calcBoundsAndCenter(fetchedBuildings));
  }, [drawingMode, fetchedBuildings, setLocation]);

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

  return (
    <>
      {drawingMode && (
        <DrawModeInterface
          mode={mode}
          buildings={fetchedBuildings}
          polygon={data}
          onFetchedBuildings={handleFetchedBuildingsChange}
          onLocationResult={setLocation}
          onModeChange={handleModeChange}
          onDelete={handleDrawDelete}
        />
      )}

      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{ height: '100%', width: '100%' }}
      >
        <Map
          {...viewState}
          onMove={handleViewStateChange}
          mapStyle={positron}
          onLoad={(e) => {
            const mapbox = e.target;
            // Store the map instance in the ref
            mapRef.current = mapbox;

            // Disable default dragRotate
            mapbox.dragRotate.disable();

            onMapLoad?.(e);
          }}
        >
          {drawingMode && (
            <DrawControl
              ref={drawRef}
              position="top-right"
              displayControlsDefault={false}
              initialPolygon={data}
              onCreate={handleDrawCreate}
              onUpdate={handleDrawUpdate}
              onDelete={handleDrawDelete}
              onModeChange={({ mode }) => handleModeChange(mode)}
            />
          )}
          <DeckGLOverlay layers={[fetchedBuildingsLayer, zoneBuildingsLayer]} />
        </Map>
      </div>
    </>
  );
};

export default EditableMap;

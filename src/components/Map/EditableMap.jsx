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
import axios from 'axios';
import { GeoJsonLayer } from 'deck.gl';
import { EXAMPLE_CITIES } from '../Project/CreateScenarioForms/constants';
import { useCameraForBounds, useGeocodeLocation } from './hooks';

import * as turf from '@turf/turf';

const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0,
};

const EMPTY_FEATURE = {
  type: 'FeatureCollection',
  features: [],
};

const useFetchBuildings = (onFetchedBuildings) => {
  const [polygon, setPolygon] = useState();
  const [buildings, setBuildings] = useState(EMPTY_FEATURE);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState();

  const fetchBuildings = async (polygon) => {
    setError(null);
    setFetching(true);
    try {
      const resp = await axios.get(
        `${import.meta.env.VITE_CEA_URL}/api/geometry/buildings`,
        {
          params: {
            generate: true,
            polygon: JSON.stringify(polygon),
          },
        },
      );
      setBuildings(resp.data);
      onFetchedBuildings?.(resp.data);
    } catch (error) {
      console.log(error);

      setError(error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (polygon && polygon?.features?.length) {
      fetchBuildings(polygon);
    } else {
      setBuildings(EMPTY_FEATURE);
    }
  }, [polygon]);

  return { setPolygon, buildings, fetching, error };
};

const LocationSearchBar = ({ onLocationResult }) => {
  const randomCity = useRef(
    EXAMPLE_CITIES[Math.floor(Math.random() * EXAMPLE_CITIES.length)],
  );

  const { locationAddress, setSearchAddress, loading } =
    useGeocodeLocation(onLocationResult);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <i>Search for a location</i>
      <Input.Search
        placeholder={`Example: type "${randomCity.current}”`}
        allowClear
        loading={loading}
        onSearch={setSearchAddress}
      />
      {locationAddress instanceof Error ? (
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

const EditableMap = ({
  viewState,
  onViewStateChange,

  onMapLoad,

  polygon,
  onPolygonChange,
  onFetchedBuildings,

  buildings,

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

  const {
    setPolygon,
    buildings: previewBuildings,
    fetching,
    error,
  } = useFetchBuildings(onFetchedBuildings); // Store fetched buildings in parent context

  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);
  const hasData = data?.features?.length > 0;

  const triggerDataChange = useCallback((data) => {
    setData(data);
    onPolygonChange?.(data);
  }, []);

  const editableLayer = new EditableGeoJsonLayer({
    id: 'editable-layer',
    data: data,
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
    data: previewBuildings,
    getFillColor: [255, 255, 255],
    getLineColor: [0, 0, 0],
    getLineWidth: 1,

    visible: drawingMode,
  });

  const buildingsLayer = new GeoJsonLayer({
    id: 'buildings-layer',
    data: buildings || EMPTY_FEATURE,
    getFillColor: [255, 255, 255],
    getLineColor: [0, 0, 0],
    getLineWidth: 1,

    visible: !drawingMode,
  });

  const ToggleDraw = () => {
    if (mode !== 'draw') {
      setMode('draw');
    } else {
      setMode(null);
    }
  };

  const ToggleEdit = () => {
    if (mode !== 'edit') {
      setMode('edit');
    } else {
      setMode(null);
    }
  };

  const deletePolygon = () => {
    triggerDataChange(EMPTY_FEATURE);
    setSelectedFeatureIndexes([]);
  };

  useEffect(() => {
    if (mode === 'draw') triggerDataChange(EMPTY_FEATURE);
    else if (mode === 'edit') setSelectedFeatureIndexes([0]);
    else setSelectedFeatureIndexes([]);
  }, [mode]);

  useEffect(() => {
    // Only fetch buildings if the mode is not draw or edit
    mode == null && setPolygon(data);
  }, [mode, data]);

  useEffect(() => {
    if (!drawingMode && buildings) {
      const boundingbox = turf.bbox(buildings);
      const centroid = turf.center(buildings);
      const coord = turf.getCoord(centroid);

      setLocation({
        boundingbox,
        longitude: coord[0],
        latitude: coord[1],
      });
    }
  }, [buildings]);

  return (
    <>
      {drawingMode && (
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
            <LocationSearchBar onLocationResult={setLocation} />

            {fetching ? (
              <b>Fetching buildings...</b>
            ) : error ? (
              <b>Error fetching buildings</b>
            ) : previewBuildings?.features?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <b>
                    Buildings found: {previewBuildings?.features?.length || 0}
                  </b>
                </div>
                <small>
                  <i>
                    The number of buildings may be different after
                    postprocessing.
                  </i>
                </small>
              </div>
            ) : null}
          </div>
          <div id="edit-map-buttons">
            {hasData ? (
              <>
                <Button
                  type={mode === 'edit' ? 'primary' : 'default'}
                  onClick={ToggleEdit}
                >
                  Edit
                </Button>
                <Button type="primary" onClick={deletePolygon} danger>
                  Delete
                </Button>
              </>
            ) : (
              <Button
                type={mode === 'draw' ? 'primary' : 'default'}
                onClick={ToggleDraw}
              >
                Draw
              </Button>
            )}
          </div>
        </>
      )}

      <div onContextMenu={(e) => e.preventDefault()}>
        <DeckGL
          viewState={viewState || defaultViewState}
          controller={{ dragRotate: false, doubleClickZoom: false }}
          layers={[editableLayer, previewBuildingsLayer, buildingsLayer]}
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

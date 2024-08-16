import { useState, useEffect, useCallback } from 'react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import positron from '../../constants/mapStyles/positron.json';
import {
  EditableGeoJsonLayer,
  DrawPolygonMode,
  ModifyMode,
  ViewMode,
} from '@deck.gl-community/editable-layers';
import { Button } from 'antd';
import './EditableMap.css';
import { DeckGL } from '@deck.gl/react';
import axios from 'axios';
import { GeoJsonLayer } from 'deck.gl';

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

const useFetchBuildings = (polygon, mode) => {
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
    } catch (error) {
      console.log(error);

      setError(error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (polygon && polygon?.features?.length) {
      mode == null && fetchBuildings(polygon);
    } else {
      setBuildings(EMPTY_FEATURE);
    }
  }, [polygon, mode]);

  return { buildings, fetching, error };
};

const EditableMap = ({
  viewState,
  onViewStateChange,

  onMapLoad,

  polygon = EMPTY_FEATURE,
  onPolygonChange,
}) => {
  const [_viewState, setViewState] = useState(defaultViewState);
  const [mode, setMode] = useState(null);
  const [data, setData] = useState(polygon || EMPTY_FEATURE);

  const { buildings, fetching, error } = useFetchBuildings(data, mode);

  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);
  const hasData = data.features.length > 0;

  const triggerViewStateChange = useCallback(({ viewState: newViewState }) => {
    setViewState(newViewState);
    onViewStateChange?.(newViewState);
  }, []);

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
  });

  const buildingsLayer = new GeoJsonLayer({
    id: 'buildings-layer',
    data: buildings,
    getFillColor: [255, 255, 255],
    getLineColor: [0, 0, 0],
    getLineWidth: 1,
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

  return (
    <>
      {hasData && (
        <div id="edit-map-area-info">
          {fetching ? (
            <b>Fetching buildings...</b>
          ) : error ? (
            <b>Error fetching buildings</b>
          ) : (
            <div
              style={{
                maxWidth: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div>
                <b>Buildings found: {buildings.features.length}</b>
              </div>
              <small>
                <i>
                  The number of buildings may be different after postprocessing.
                </i>
              </small>
            </div>
          )}
        </div>
      )}

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

      <div onContextMenu={(e) => e.preventDefault()}>
        <DeckGL
          viewState={viewState || _viewState}
          controller={{ dragRotate: false, doubleClickZoom: false }}
          layers={[editableLayer, buildingsLayer]}
          onViewStateChange={triggerViewStateChange}
        >
          <Map mapStyle={positron} onLoad={onMapLoad} />
        </DeckGL>
      </div>
    </>
  );
};

export default EditableMap;

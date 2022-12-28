import { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import ReactMapGL from 'react-map-gl';
import mapStyles from '../../constants/mapStyles';
import { EditableGeoJsonLayer } from 'nebula.gl';
import { Button } from 'antd';
import 'mapbox-gl/dist/mapbox-gl.css';
import './EditableMap.css';
import { area as calcArea, polygon } from '@turf/turf';

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

export const calcPolyArea = (geojson) => {
  const poly = geojson.features[0]?.geometry?.coordinates;
  if (typeof poly === 'undefined') return 0;
  const site = polygon(geojson.features[0].geometry.coordinates);
  // convert area from m^2 to km^2
  const area = (calcArea(site) / 1000000).toFixed(2);

  return area;
};

const EditableMap = ({
  location = defaultViewState,
  geojson = null,
  outputGeojson = null,
}) => {
  const [viewState, setViewState] = useState(defaultViewState);
  const [mode, setMode] = useState('view');
  const [data, setData] = useState(geojson !== null ? geojson : EMPTY_FEATURE);
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);
  const hasData = !!data.features.length;

  const layer = new EditableGeoJsonLayer({
    id: 'geojson-layer',
    data: data,
    mode: mode,
    selectedFeatureIndexes: selectedFeatureIndexes,

    onEdit: ({ updatedData }) => {
      if (mode === 'drawPolygon') {
        setMode('view');
        setSelectedFeatureIndexes([0]);
      }
      setData(updatedData);
    },

    onLayerClick: () => {},
  });

  const onViewStateChange = ({ viewState }) => {
    setViewState(viewState);
  };

  const changeToDraw = () => {
    if (mode !== 'drawPolygon') {
      setMode('drawPolygon');
    } else {
      setMode('view');
    }
  };

  const changeToEdit = () => {
    if (mode !== 'modify') {
      setMode('modify');
    } else {
      setMode('view');
    }
  };

  const deletePolygon = () => {
    setData(EMPTY_FEATURE);
    setSelectedFeatureIndexes([]);
  };

  useEffect(() => {
    setTimeout(
      () => setViewState((viewState) => ({ ...viewState, ...location })),
      0
    );
  }, [location]);

  useEffect(() => {
    if (outputGeojson) {
      if (hasData) {
        outputGeojson(data);
      } else {
        outputGeojson(null);
      }
    }
  }, [data]);

  return (
    <>
      {hasData && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            padding: 10,
            zIndex: 5,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            fontWeight: 600,
          }}
        >
          {`Selected Area: ${calcPolyArea(data)} km2`}
        </div>
      )}
      <div
        id="edit-map-buttons"
        style={{
          position: 'absolute',
          right: 0,
          padding: 10,
          display: 'none',
          zIndex: 5,
        }}
      >
        {hasData ? null : (
          <Button
            type={mode === 'drawPolygon' ? 'primary' : 'default'}
            onClick={changeToDraw}
          >
            Draw
          </Button>
        )}
        {!hasData ? null : (
          <Button
            type={mode === 'modify' ? 'primary' : 'default'}
            onClick={changeToEdit}
          >
            {mode !== 'modify' ? 'Edit' : 'Done'}
          </Button>
        )}
        {!hasData || mode === 'modify' ? null : (
          <Button type="danger" onClick={deletePolygon}>
            Delete
          </Button>
        )}
      </div>
      <DeckGL
        viewState={viewState}
        controller={{ doubleClickZoom: false, dragRotate: false }}
        layers={[layer]}
        onViewStateChange={onViewStateChange}
        useDevicePixels={false}
      >
        <ReactMapGL
          mapStyle={mapStyles.LIGHT_MAP}
          onLoad={() => {
            document.getElementById('edit-map-buttons').style.display = 'block';
          }}
        />
      </DeckGL>
    </>
  );
};

export default EditableMap;

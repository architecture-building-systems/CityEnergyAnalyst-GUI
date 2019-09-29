import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import ReactMapGL from 'react-map-gl';
import mapStyles from '../../constants/mapStyles';
import { EditableGeoJsonLayer } from 'nebula.gl';
import { Button } from 'antd';
import './EditableMap.css';

const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0
};

const EMPTY_FEATURE = {
  type: 'FeatureCollection',
  features: []
};

const EditableMap = ({
  location = defaultViewState,
  geojson = null,
  outputGeojson = null
}) => {
  const [viewState, setViewState] = useState(defaultViewState);
  const [mode, setMode] = useState('view');
  const [data, setData] = useState(geojson !== null ? geojson : EMPTY_FEATURE);
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState([]);
  const hasData = data.features.length;

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

    onLayerClick: () => {}
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
      () => setViewState(viewState => ({ ...viewState, ...location })),
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
    <React.Fragment>
      <div
        id="edit-map-buttons"
        style={{
          position: 'absolute',
          right: 0,
          padding: 10,
          display: 'none',
          zIndex: 5
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
      >
        <ReactMapGL
          mapStyle={mapStyles.LIGHT_MAP}
          onLoad={() => {
            document.getElementById('edit-map-buttons').style.display = 'block';
          }}
        />
      </DeckGL>
    </React.Fragment>
  );
};

export default EditableMap;

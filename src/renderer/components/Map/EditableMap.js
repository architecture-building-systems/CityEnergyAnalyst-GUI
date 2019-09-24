import React, { useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import ReactMapGL, {
  _MapContext as MapContext,
  NavigationControl
} from 'react-map-gl';
import mapStyles from '../../constants/mapStyles';
import { EditableGeoJsonLayer } from 'nebula.gl';

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

const EditableMap = ({ location = defaultViewState, outputGeojson = null }) => {
  const [viewState, setViewState] = useState(defaultViewState);
  const [mode, setMode] = useState('view');
  const [selectedFeatureIndexes, setSelected] = useState([]);
  const [data, setData] = useState(EMPTY_FEATURE);
  const hasData = data.features.length;

  const layer = new EditableGeoJsonLayer({
    id: 'geojson-layer',
    data: data,
    mode: mode,
    selectedFeatureIndexes: selectedFeatureIndexes,

    onEdit: ({ updatedData }) => {
      if (mode === 'drawPolygon') {
        setMode('view');
      }
      setData(updatedData);
    },

    onLayerClick: () => {}
  });

  const onViewStateChange = ({ viewState }) => {
    setViewState(viewState);
  };

  const changeToDraw = () => {
    setMode('drawPolygon');
  };

  const changeToEdit = () => {
    if (mode !== 'modify') {
      setMode('modify');
    } else {
      setMode('view');
    }
  };

  useEffect(() => {
    location && setViewState({ ...viewState, ...location });
  }, [location]);

  useEffect(() => {
    if (mode === 'drawPolygon') {
      setData(EMPTY_FEATURE);
    }
    if (mode === 'modify') {
      if (hasData) {
        setSelected([0]);
      } else {
        setSelected([]);
      }
    }
  }, [mode]);

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
      <div style={{ position: 'absolute', right: 0, zIndex: 3, padding: 10 }}>
        <button onClick={changeToDraw}>Draw</button>
        <button onClick={changeToEdit}>
          {mode !== 'modify' ? 'Edit' : 'Done'}
        </button>
      </div>
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={[layer]}
        ContextProvider={MapContext.Provider}
        onViewStateChange={onViewStateChange}
      >
        <ReactMapGL mapStyle={mapStyles.LIGHT_MAP} />
      </DeckGL>
    </React.Fragment>
  );
};

export default EditableMap;

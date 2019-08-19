import React, { useRef, useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import ReactMapGL, { _MapContext as MapContext } from 'react-map-gl';
import mapStyles from '../../constants/mapStyles';
import inputEndpoints from '../../constants/inputEndpoints';
import axios from 'axios';

// Initial viewport settings
const initialViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0
};

const Map = ({ style, layerList }) => {
  const mapRef = useRef();
  const [viewState, setViewState] = useState(initialViewState);
  const [layers, setLayers] = useState([]);
  const [data, setData] = useState();

  useEffect(() => {
    let promises = layerList.map(type => {
      return axios.get(inputEndpoints[type]).catch(error => console.log(error));
    });
    axios
      .all(promises)
      .then(results => {
        let _data = {};
        for (var i = 0; i < layerList.length; i++) {
          if (results[i].status === 200) {
            _data[layerList[i]] = results[i].data;
          }
        }
        setData(_data);
      })
      .catch(error => console.log(error));
  }, []);

  useEffect(() => {
    if (data) {
      setCameraOptions(data.zone.bbox);
      renderLayers();
    }
  }, [data]);

  const renderLayers = () => {
    let _layers = [];
    if (typeof data.zone !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'zone',
          data: data.zone,
          filled: true
        })
      );
    }
    if (typeof data.district !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'district',
          data: data.district,
          filled: true
        })
      );
    }
    if (typeof data.streets !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'streets',
          data: data.streets
        })
      );
    }
    setLayers(_layers);
  };

  const setCameraOptions = bbox => {
    let cameraOptions = mapRef.current.cameraForBounds(
      [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
      {
        maxZoom: 18,
        padding: 30
      }
    );
    setViewState({
      ...viewState,
      zoom: cameraOptions.zoom,
      latitude: cameraOptions.center.lat,
      longitude: cameraOptions.center.lng,
      transitionDuration: 1500
    });
  };

  const _onViewStateChange = ({ viewState }) => {
    setViewState(viewState);
  };

  return (
    <div style={style}>
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={layers}
        ContextProvider={MapContext.Provider}
        onViewStateChange={_onViewStateChange}
      >
        <ReactMapGL
          ref={ref => (mapRef.current = ref && ref.getMap())}
          mapStyle={mapStyles.LIGHT_MAP}
        />
      </DeckGL>
    </div>
  );
};

export default Map;

import React, { useRef, useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import ReactMapGL, { _MapContext as MapContext } from 'react-map-gl';
import mapStyles from '../../constants/mapStyles';
import inputEndpoints from '../../constants/inputEndpoints';
import axios from 'axios';
import { Spin } from 'antd';

// Initial viewport settings
const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0
};

export const useGeoJson = layerList => {
  const [data, setData] = useState();

  useEffect(() => {
    let promises = layerList.map(type => {
      return axios
        .get(inputEndpoints[type])
        .catch(error => console.log(error.response.data));
    });
    axios
      .all(promises)
      .then(results => {
        let _data = {};
        for (var i = 0; i < layerList.length; i++) {
          if (results[i] && results[i].status === 200) {
            _data[layerList[i]] = results[i].data;
          }
        }
        Object.keys(_data).length && setData(_data);
      })
      .catch(error => console.log(error));
  }, []);

  return data;
};

const Map = ({ style, data, children }) => {
  const getInitialViewState = () => {
    if (data && typeof data.zone !== 'undefined') {
      let bbox = data.zone.bbox;
      return {
        ...defaultViewState,
        longitude: (bbox[0] + bbox[2]) / 2,
        latitude: (bbox[1] + bbox[3]) / 2,
        zoom: 15
      };
    }
    return defaultViewState;
  };
  return (
    <div style={style}>
      {data ? (
        <DeckGLMap data={data} initialViewState={getInitialViewState()}>
          {children}
        </DeckGLMap>
      ) : (
        <Spin />
      )}
    </div>
  );
};

const DeckGLMap = ({ data, children, initialViewState }) => {
  const mapRef = useRef();
  const [viewState, setViewState] = useState(initialViewState);
  const [layers, setLayers] = useState(renderLayers);

  function renderLayers() {
    let _layers = [];
    if (typeof data.zone !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'zone',
          data: data.zone,
          filled: true,
          extruded: true,

          getElevation: f => f.properties['height_ag']
        })
      );
    }
    if (typeof data.district !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'district',
          data: data.district,
          filled: true,
          extruded: true,

          getElevation: f => f.properties['height_ag']
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
    return _layers;
  }

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
      {children}
    </DeckGL>
  );
};

export default Map;

import React, { useRef, useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import ReactMapGL, {
  _MapContext as MapContext,
  NavigationControl
} from 'react-map-gl';
import mapStyles from '../../constants/mapStyles';
import { Spin } from 'antd';
import { bbox as calculateBBox, helpers } from '@turf/turf';
import inputEndpoints from '../../constants/inputEndpoints';
import axios from 'axios';
import { Toggle3DControl, ToggleMapStyleControl } from './MapButtons';

// Initial viewport settings
const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0
};

const Map = ({ style, data, children }) => {
  return (
    <div style={style}>
      {data ? (
        <DeckGLMap data={data} initialViewState={defaultViewState}>
          {children}
        </DeckGLMap>
      ) : (
        <Spin />
      )}
    </div>
  );
};

const DeckGLMap = ({ data, children, initialViewState }) => {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState(initialViewState);
  const [extruded, setExtruded] = useState(false);
  const [mapStyle, setMapStyle] = useState('LIGHT_MAP');

  const renderLayers = () => {
    let _layers = [];
    if (typeof data.zone !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'zone',
          data: data.zone,
          opacity: 0.5,
          wireframe: true,
          filled: true,
          extruded: extruded,

          getElevation: f => f.properties['height_ag'],
          getFillColor: [255, 0, 0],

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128]
        })
      );
    }
    if (typeof data.district !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'district',
          data: data.district,
          opacity: 0.5,
          wireframe: true,
          filled: true,
          extruded: extruded,

          getElevation: f => f.properties['height_ag'],
          getFillColor: [255, 0, 0],

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128]
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
  };

  const _onViewStateChange = ({ viewState }) => {
    setViewState(viewState);
  };

  const onLoad = () => {
    const map = mapRef.current.getMap();

    // Calculate camera options
    let points = [];
    if (typeof data.zone !== 'undefined') {
      let bbox = data.zone.bbox;
      points.push([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
    }
    if (typeof data.district !== 'undefined') {
      let bbox = data.district.bbox;
      points.push([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
    }
    let bbox = calculateBBox(helpers.multiPoint(points));
    let cameraOptions = map.cameraForBounds(bbox, {
      maxZoom: 18,
      padding: 30
    });
    setViewState({
      ...viewState,
      zoom: cameraOptions.zoom,
      latitude: cameraOptions.center.lat,
      longitude: cameraOptions.center.lng
    });
  };

  return (
    <React.Fragment>
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={renderLayers()}
        ContextProvider={MapContext.Provider}
        onViewStateChange={_onViewStateChange}
      >
        <ReactMapGL
          ref={mapRef}
          mapStyle={mapStyles[mapStyle]}
          onLoad={onLoad}
        />
        <div style={{ position: 'absolute', right: 0, zIndex: 3, padding: 10 }}>
          <NavigationControl />
          <br />
          <Toggle3DControl callback={setExtruded} />
          <br />
          <ToggleMapStyleControl callback={setMapStyle} />
        </div>
      </DeckGL>
      {children}
    </React.Fragment>
  );
};

export const useGeoJsons = layerList => {
  const [geojsons, setGeoJsons] = useState();

  useEffect(() => {
    let promises = layerList.map(type => {
      return axios.get(inputEndpoints[type]).catch(error => {
        return console.log(error.response.data);
      });
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
        setGeoJsons(_data);
      })
      .catch(error => console.log(error));
  }, []);

  return [geojsons, setGeoJsons];
};

export default Map;

import React, { useRef, useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import ReactMapGL, {
  _MapContext as MapContext,
  NavigationControl
} from 'react-map-gl';
import mapStyles from '../../constants/mapStyles';
import { Spin, Icon } from 'antd';
import {
  bbox as calcBBox,
  area as calcArea,
  length as calcLength,
  helpers
} from '@turf/turf';
import inputEndpoints from '../../constants/inputEndpoints';
import axios from 'axios';
import { Toggle3DControl, ToggleMapStyleControl } from './MapButtons';
import './Map.css';

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
    <Spin
      spinning={!data}
      indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
      tip="Loading Map..."
    >
      <div style={style}>
        {data && (
          <DeckGLMap data={data} initialViewState={defaultViewState}>
            {children}
          </DeckGLMap>
        )}
      </div>
    </Spin>
  );
};

const DeckGLMap = ({ data, children, initialViewState }) => {
  const mapRef = useRef();
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
          getFillColor: [0, 0, 255],

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128],

          onHover: updateTooltip
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
          highlightColor: [255, 255, 0, 128],

          onHover: updateTooltip
        })
      );
    }
    if (typeof data.streets !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'streets',
          data: data.streets,
          getLineColor: [0, 255, 0],
          getLineWidth: 1,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip
        })
      );
    }
    if (typeof data.dc !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'dc',
          data: data.dc,
          stroked: false,
          filled: true,

          getLineColor: [0, 0, 255],
          getFillColor: f => nodeFillColor(f.properties['Type']),
          getLineWidth: 3,
          getRadius: 3,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip
        })
      );
    }
    if (typeof data.dh !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'dh',
          data: data.dh,
          stroked: false,
          filled: true,

          getLineColor: [255, 0, 0],
          getFillColor: f => nodeFillColor(f.properties['Type']),
          getLineWidth: 3,
          getRadius: 3,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip
        })
      );
    }
    return _layers;
  };

  const onViewStateChange = ({ viewState }) => {
    setViewState(viewState);
  };

  const onDragStart = (info, event) => {
    let dToggleButton = document.getElementById('3d-button');
    if (event.rightButton && !extruded) {
      dToggleButton.click();
    }
  };

  const onLoad = () => {
    const map = mapRef.current.getMap();

    // Calculate camera options
    // let points = [];
    // if (typeof data.zone !== 'undefined') {
    //   let bbox = data.zone.bbox;
    //   points.push([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
    // }
    // if (typeof data.district !== 'undefined') {
    //   let bbox = data.district.bbox;
    //   points.push([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
    // }
    // let bbox = calcBBox(helpers.multiPoint(points));
    // let cameraOptions = map.cameraForBounds(bbox, {
    //   maxZoom: 18,
    //   padding: 30
    // });
    // setViewState({
    //   ...viewState,
    //   zoom: cameraOptions.zoom,
    //   latitude: cameraOptions.center.lat,
    //   longitude: cameraOptions.center.lng
    // });
  };

  return (
    <React.Fragment>
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={renderLayers()}
        ContextProvider={MapContext.Provider}
        onViewStateChange={onViewStateChange}
        onDragStart={onDragStart}
      >
        <ReactMapGL
          ref={mapRef}
          mapStyle={mapStyles[mapStyle]}
          onLoad={onLoad}
        />
        <div style={{ position: 'absolute', right: 0, zIndex: 3, padding: 10 }}>
          <NavigationControl showZoom={false} />
          <br />
          <Toggle3DControl
            callback={setExtruded}
            viewstate={viewState}
            setviewstate={setViewState}
          />
          <br />
          <ToggleMapStyleControl callback={setMapStyle} />
        </div>
      </DeckGL>
      <div id="map-tooltip"></div>
      {children}
    </React.Fragment>
  );
};

function updateTooltip({ x, y, object, layer }) {
  const tooltip = document.getElementById('map-tooltip');
  if (object) {
    tooltip.style.top = `${y}px`;
    tooltip.style.left = `${x}px`;
    let innerHTML = '';
    let properties = object.properties;

    if (layer.id === 'zone' || layer.id === 'district') {
      Object.keys(properties).forEach(key => {
        innerHTML += `<div><b>${key}</b>: ${properties[key]}</div>`;
      });
      let area = calcArea(object);
      innerHTML +=
        `<br><div><b>area</b>: ${Math.round(area * 1000) /
          1000}m<sup>2</sup></div>` +
        `<div><b>volume</b>: ${Math.round(
          area * properties['height_ag'] * 1000
        ) / 1000}m<sup>3</sup></div>`;
    } else if (layer.id === 'dc_networks' || layer.id === 'dh_networks') {
      if (typeof !properties.Building !== 'undefined') {
        let length = calcLength(object) * 1000;
        innerHTML += `<br><div><b>length</b>: ${Math.round(length * 1000) /
          1000}m</div>`;
      }
    } else {
      Object.keys(properties).forEach(key => {
        innerHTML += `<div><b>${key}</b>: ${properties[key]}</div>`;
      });
    }

    tooltip.innerHTML = innerHTML;
  } else {
    tooltip.innerHTML = '';
  }
}

function nodeFillColor(type) {
  if (type === 'NONE') return [100, 100, 100];
  if (type === 'CONSUMER') return [255, 255, 255];
  if (type === 'PLANT') return [0, 0, 0];
}

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

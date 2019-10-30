import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
import {
  Toggle3DControl,
  ToggleMapStyleControl,
  ResetCameraControl
} from './MapButtons';
import { setSelected } from '../../actions/inputEditor';
import './Map.css';

// Initial viewport settings
const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0
};

const Map = ({ style, data, colors, loading }) => {
  if (loading)
    return (
      <Spin
        indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
        tip="Loading Map..."
      >
        <div style={style}></div>
      </Spin>
    );
  if (!data) return null;
  return (
    <div style={style}>
      <DeckGLMap
        data={data}
        colors={colors}
        initialViewState={defaultViewState}
      />
    </div>
  );
};

const DeckGLMap = ({ data, colors, initialViewState }) => {
  const mapRef = useRef();
  const cameraOptions = useRef();
  const glRef = useRef();
  const selectedLayer = useRef();
  const dispatch = useDispatch();
  const selected = useSelector(state => state.inputData.selected);
  const connectedBuildings = useSelector(
    state => state.inputData.connected_buildings
  );
  const [layers, setLayers] = useState([]);
  const [viewState, setViewState] = useState(initialViewState);
  const [extruded, setExtruded] = useState(false);
  const [visibility, setVisibility] = useState({
    zone: !!data.zone,
    district: !!data.district,
    streets: !!data.streets,
    dc: !!data.dc,
    dh: !!data.dh && !data.dc,
    network: true
  });
  const [mapStyle, setMapStyle] = useState('LIGHT_MAP');

  const renderLayers = () => {
    const network_type = visibility.dc ? 'dc' : 'dh';
    let _layers = [];
    if (data.zone) {
      _layers.push(
        new GeoJsonLayer({
          id: 'zone',
          data: data.zone,
          opacity: 0.5,
          wireframe: true,
          filled: true,
          extruded: extruded,
          visible: visibility.zone,

          getElevation: f => f.properties['height_ag'],
          getFillColor: f =>
            buildingColor(
              f.properties['Name'],
              'zone',
              colors,
              connectedBuildings[network_type],
              selected,
              network_type
            ),
          updateTriggers: {
            getFillColor: selected
          },

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128],

          onHover: updateTooltip,
          onClick: onClick
        })
      );
    }
    if (data.district) {
      _layers.push(
        new GeoJsonLayer({
          id: 'district',
          data: data.district,
          opacity: 0.5,
          wireframe: true,
          filled: true,
          extruded: extruded,
          visible: visibility.district,

          getElevation: f => f.properties['height_ag'],
          getFillColor: f =>
            buildingColor(
              f.properties['Name'],
              'district',
              colors,
              connectedBuildings[network_type],
              selected,
              network_type
            ),
          updateTriggers: {
            getFillColor: selected
          },

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128],

          onHover: updateTooltip,
          onClick: onClick
        })
      );
    }
    if (data.streets) {
      _layers.push(
        new GeoJsonLayer({
          id: 'streets',
          data: data.streets,
          getLineColor: [0, 255, 0],
          getLineWidth: 1,
          visible: visibility.streets,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip
        })
      );
    }
    if (data.dc) {
      _layers.push(
        new GeoJsonLayer({
          id: 'dc',
          data: data.dc,
          stroked: false,
          filled: true,
          visible: visibility.dc && visibility.network,

          getLineColor: colors.dc,
          getFillColor: f => nodeFillColor(f.properties['Type'], colors, 'dc'),
          getLineWidth: 3,
          getRadius: 3,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip
        })
      );
    }
    if (data.dh) {
      _layers.push(
        new GeoJsonLayer({
          id: 'dh',
          data: data.dh,
          stroked: false,
          filled: true,
          visible: visibility.dh && visibility.network,

          getLineColor: colors.dh,
          getFillColor: f => nodeFillColor(f.properties['Type'], colors, 'dh'),
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
    let points = [];
    ['zone', 'district'].map(layer => {
      if (data[layer]) {
        let bbox = data[layer].bbox;
        points.push([bbox[0], bbox[1]], [bbox[2], bbox[3]]);
      }
    });
    let bbox = calcBBox(helpers.multiPoint(points));
    cameraOptions.current = map.cameraForBounds(bbox, {
      maxZoom: 18,
      padding: 30
    });
    setViewState({
      ...viewState,
      zoom: cameraOptions.current.zoom,
      latitude: cameraOptions.current.center.lat,
      longitude: cameraOptions.current.center.lng
    });
  };

  const onClick = ({ object, layer }, event) => {
    if (layer.id !== selectedLayer.current) {
      dispatch(setSelected([object.properties['Name']]));
      selectedLayer.current = layer.id;
    } else {
      let index = -1;
      let newSelected = [...selected];
      if (event.srcEvent.ctrlKey && event.leftButton) {
        index = newSelected.findIndex(x => x === object.properties['Name']);
        if (index !== -1) {
          newSelected.splice(index, 1);
          dispatch(setSelected(newSelected));
        } else {
          newSelected.push(object.properties['Name']);
          dispatch(setSelected(newSelected));
        }
      } else {
        dispatch(setSelected([object.properties['Name']]));
      }
    }
  };

  useEffect(
    // Clear WebGL context
    () => () => {
      if (glRef.current) {
        const extension = glRef.current.getExtension('WEBGL_lose_context');
        if (extension) extension.loseContext();
      }
    },
    []
  );

  useEffect(() => {
    setLayers(renderLayers());
  }, [data, visibility, extruded, selected]);

  return (
    <React.Fragment>
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={layers}
        ContextProvider={MapContext.Provider}
        onViewStateChange={onViewStateChange}
        onDragStart={onDragStart}
        onWebGLInitialized={gl => (glRef.current = gl)}
      >
        <ReactMapGL
          ref={mapRef}
          mapStyle={mapStyles[mapStyle]}
          onLoad={onLoad}
        />
        <div style={{ position: 'absolute', right: 0, zIndex: 3, padding: 10 }}>
          <NavigationControl showZoom={false} />
          <Toggle3DControl
            callback={setExtruded}
            viewState={viewState}
            setViewState={setViewState}
          />
          <ResetCameraControl
            cameraOptions={cameraOptions.current}
            viewState={viewState}
            setViewState={setViewState}
          />
          <ToggleMapStyleControl callback={setMapStyle} />
        </div>
      </DeckGL>
      <NetworkToggle data={data} setVisibility={setVisibility} />
      <LayerToggle data={data} setVisibility={setVisibility} />
      <div id="map-tooltip"></div>
    </React.Fragment>
  );
};

const NetworkToggle = ({ data, setVisibility }) => {
  const handleChange = e => {
    const { value } = e.target;
    setVisibility(oldValue => ({
      ...oldValue,
      dc: value === 'dc',
      dh: value === 'dh'
    }));
  };
  return (
    <div className="network-toggle">
      <span>Network Type:</span>
      {data.dc && (
        <label className="map-plot-label network-label">
          <input
            type="radio"
            name="network-type"
            value="dc"
            onChange={handleChange}
            defaultChecked
          />
          District Cooling
        </label>
      )}
      {data.dh && (
        <label className="map-plot-label network-label">
          <input
            type="radio"
            name="network-type"
            value="dh"
            onChange={handleChange}
            defaultChecked={!data.dc}
          />
          District Heating
        </label>
      )}
      {!data.dc && !data.dh && <div>No networks found</div>}
    </div>
  );
};

const LayerToggle = ({ data, setVisibility }) => {
  const handleChange = e => {
    const { value, checked } = e.target;
    setVisibility(oldValue => ({ ...oldValue, [value]: checked }));
  };
  return (
    <div id="layers-group">
      {data.zone && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="zone"
              onChange={handleChange}
              defaultChecked
            />
            Zone
          </label>
        </span>
      )}
      {data.district && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="district"
              onChange={handleChange}
              defaultChecked
            />
            District
          </label>
        </span>
      )}
      {data.streets && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="streets"
              onChange={handleChange}
              defaultChecked
            />
            Streets
          </label>
        </span>
      )}
      {(data.dh || data.dc) && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="network"
              onChange={handleChange}
              defaultChecked
            />
            Network
          </label>
        </span>
      )}
    </div>
  );
};

function updateTooltip({ x, y, object, layer }) {
  const tooltip = document.getElementById('map-tooltip');
  if (object) {
    const { properties } = object;
    tooltip.style.top = `${y}px`;
    tooltip.style.left = `${x}px`;
    let innerHTML = '';

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
    } else if (layer.id === 'dc' || layer.id === 'dh') {
      Object.keys(properties).forEach(key => {
        if (key !== 'Building' && properties[key] === 'NONE') return null;
        innerHTML += `<div><b>${key}</b>: ${properties[key]}</div>`;
      });
      if (properties['Buildings']) {
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

const nodeFillColor = (type, colors, network) => {
  if (type === 'NONE') {
    return network === 'dc' ? colors.dc : colors.dh;
  } else if (type === 'CONSUMER') {
    return [255, 255, 255];
  } else if (type === 'PLANT') {
    return [0, 0, 0];
  }
};

const buildingColor = (
  buildingName,
  layer,
  colors,
  connectedBuildings,
  selected,
  network_type
) => {
  if (selected.includes(buildingName)) {
    return [255, 255, 0, 255];
  }
  if (layer === 'district') return colors.district;
  if (connectedBuildings.includes(buildingName)) return colors[network_type];
  return colors.disconnected;
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

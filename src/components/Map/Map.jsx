import { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { GeoJsonLayer } from '@deck.gl/layers/typed';
import { MapboxOverlay } from '@deck.gl/mapbox/typed';

import mapStyles from '../../constants/mapStyles';
import { area as calcArea, length as calcLength } from '@turf/turf';
import { setSelected } from '../../actions/inputEditor';
import './Map.css';

import Map from 'react-map-gl';
import { useControl } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LayerToggle, NetworkToggle } from './Toggle';

// Initial viewport settings
const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 1,
  pitch: 0,
  bearing: 0,
};

function DeckGLOverlay(props) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const DeckGLMap = ({ data, colors }) => {
  const mapRef = useRef();
  const cameraOptions = useRef();
  const selectedLayer = useRef();
  const dispatch = useDispatch();
  const selected = useSelector((state) => state.inputData.selected);
  const connectedBuildings = useSelector(
    (state) => state.inputData.connected_buildings
  );
  const [layers, setLayers] = useState([]);
  const [viewState, setViewState] = useState(defaultViewState);
  const [extruded, setExtruded] = useState(false);
  const [visibility, setVisibility] = useState({
    zone: !!data.zone,
    surroundings: !!data.surroundings,
    streets: !!data.streets,
    dc: !!data.dc,
    dh: !!data.dh && !data.dc,
    network: true,
  });
  const [mapStyle, setMapStyle] = useState('LIGHT_MAP');

  const onMapLoad = useCallback(() => {
    console.debug('Map loaded.');

    const mapbox = mapRef.current.getMap();
    const bbox = data?.zone.bbox;
    if (bbox === null) return;

    cameraOptions.current = mapbox.cameraForBounds(bbox, {
      maxZoom: 16,
      padding: 8,
    });

    setViewState({
      ...viewState,
      zoom: cameraOptions.current.zoom,
      latitude: cameraOptions.current.center.lat,
      longitude: cameraOptions.current.center.lng,
    });
  });

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

          getElevation: (f) => f.properties['height_ag'],
          getFillColor: (f) =>
            buildingColor(
              f.properties['Name'],
              'zone',
              colors,
              connectedBuildings[network_type],
              selected,
              network_type
            ),
          updateTriggers: {
            getFillColor: selected,
          },

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128],

          onHover: updateTooltip,
          onClick: onClick,
        })
      );
    }
    if (data.surroundings) {
      _layers.push(
        new GeoJsonLayer({
          id: 'surroundings',
          data: data.surroundings,
          opacity: 0.5,
          wireframe: true,
          filled: true,
          extruded: extruded,
          visible: visibility.surroundings,

          getElevation: (f) => f.properties['height_ag'],
          getFillColor: (f) =>
            buildingColor(
              f.properties['Name'],
              'surroundings',
              colors,
              connectedBuildings[network_type],
              selected,
              network_type
            ),
          updateTriggers: {
            getFillColor: selected,
          },

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128],

          onHover: updateTooltip,
          onClick: onClick,
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

          onHover: updateTooltip,
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
          getFillColor: (f) =>
            nodeFillColor(f.properties['Type'], colors, 'dc'),
          getLineWidth: 3,
          getRadius: 3,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip,
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
          getFillColor: (f) =>
            nodeFillColor(f.properties['Type'], colors, 'dh'),
          getLineWidth: 3,
          getRadius: 3,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip,
        })
      );
    }
    return _layers;
  };

  const onViewStateChange = ({ viewState }) => {
    setViewState(viewState);
  };

  const onPitchStart = (event) => {
    // let dToggleButton = document.getElementById('3d-button');
    // if (event.rightButton && !extruded) {
    //   dToggleButton.click();
    // }
    console.log(event);
  };

  const onClick = ({ object, layer }, event) => {
    if (layer.id !== selectedLayer.current) {
      dispatch(setSelected([object.properties['Name']]));
      selectedLayer.current = layer.id;
    } else {
      let index = -1;
      let newSelected = [...selected];
      if (event.srcEvent.ctrlKey && event.leftButton) {
        index = newSelected.findIndex((x) => x === object.properties['Name']);
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

  useEffect(() => {
    setLayers(renderLayers());
  }, [data, visibility, extruded, selected]);

  return (
    <>
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={mapStyles[mapStyle]}
        onLoad={onMapLoad}
        onMove={onViewStateChange}
        onPitchStart={onPitchStart}
        onContextMenu={(e) => e.preventDefault()}
        {...viewState}
      >
        <DeckGLOverlay layers={layers} />

        <NetworkToggle data={data} setVisibility={setVisibility} />
        <LayerToggle data={data} setVisibility={setVisibility} />
      </Map>
      <div id="map-tooltip"></div>
    </>
  );
};

function updateTooltip({ x, y, object, layer }) {
  const tooltip = document.getElementById('map-tooltip');
  if (object) {
    const { properties } = object;
    tooltip.style.top = `${y}px`;
    tooltip.style.left = `${x}px`;
    let innerHTML = '';

    if (layer.id === 'zone' || layer.id === 'surroundings') {
      innerHTML += `<div><b>Name</b>: ${properties.Name}</div><br />`;
      Object.keys(properties)
        .sort()
        .forEach((key) => {
          if (key != 'Name')
            innerHTML += `<div><b>${key}</b>: ${properties[key]}</div>`;
        });
      let area = Math.round(calcArea(object) * 1000) / 1000;
      innerHTML += `<br><div><b>Floor Area</b>: ${area}m<sup>2</sup></div>`;
      if (layer.id === 'zone')
        innerHTML += `<div><b>GFA</b>: ${
          Math.round(
            (properties['floors_ag'] + properties['floors_bg']) * area * 1000
          ) / 1000
        }m<sup>2</sup></div>`;
    } else if (layer.id === 'dc' || layer.id === 'dh') {
      Object.keys(properties).forEach((key) => {
        if (key !== 'Building' && properties[key] === 'NONE') return null;
        innerHTML += `<div><b>${key}</b>: ${properties[key]}</div>`;
      });
      if (properties['Buildings']) {
        let length = calcLength(object) * 1000;
        innerHTML += `<br><div><b>length</b>: ${
          Math.round(length * 1000) / 1000
        }m</div>`;
      }
    } else {
      Object.keys(properties).forEach((key) => {
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
  if (layer === 'surroundings') return colors.surroundings;
  if (connectedBuildings.includes(buildingName)) return colors[network_type];
  return colors.disconnected;
};

export default DeckGLMap;

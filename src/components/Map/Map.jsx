import { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';

import positron from '../../constants/mapStyles/positron.json';
import no_label from '../../constants/mapStyles/positron_nolabel.json';

import * as turf from '@turf/turf';
import { setSelected } from '../../actions/inputEditor';
import './Map.css';

import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LayerToggle, NetworkToggle } from './Toggle';
import { Button, Switch } from 'antd';

// Initial viewport settings
const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0,
};

const DeckGLMap = ({ data, colors }) => {
  const mapRef = useRef();
  const cameraOptions = useRef();
  const selectedLayer = useRef();
  const firstPitch = useRef(false);
  const dispatch = useDispatch();
  const selected = useSelector((state) => state.inputData.selected);
  const connectedBuildings = useSelector(
    (state) => state.inputData.connected_buildings,
  );
  const [layers, setLayers] = useState([]);
  const [viewState, setViewState] = useState(defaultViewState);
  const [extruded, setExtruded] = useState(false);
  const [visibility, setVisibility] = useState({
    zone: !!data.zone,
    surroundings: !!data.surroundings,
    trees: !!data.trees,
    streets: !!data.streets,
    dc: data?.dc !== null,
    dh: data?.dh !== null && data?.dc === null,
    network: true,
  });

  const [mapStyle, setMapStyle] = useState('labels');

  const onMapLoad = useCallback(() => {
    console.debug('Map loaded.');

    const mapbox = mapRef.current.getMap();
    const zone = data?.zone;
    if (zone === null) return;

    // Calculate total bounds with other geometries
    let bboxPoly = turf.bboxPolygon(turf.bbox(zone));

    if (data?.surroundings !== null && data.surroundings?.features?.length)
      bboxPoly = turf.union(
        turf.featureCollection([
          bboxPoly,
          turf.bboxPolygon(turf.bbox(data.surroundings)),
        ]),
      );

    if (data?.trees !== null && data.trees?.features?.length)
      bboxPoly = turf.union(
        turf.featureCollection([
          bboxPoly,
          turf.bboxPolygon(turf.bbox(data.trees)),
        ]),
      );

    cameraOptions.current = mapbox.cameraForBounds(turf.bbox(bboxPoly), {
      maxZoom: 16,
      padding: 8,
    });

    setViewState((state) => ({
      ...state,
      zoom: cameraOptions.current.zoom,
      bearing: cameraOptions.current.bearing,
      latitude: cameraOptions.current.center.lat,
      longitude: cameraOptions.current.center.lng,
    }));
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
              network_type,
            ),
          updateTriggers: {
            getFillColor: [selected, visibility.dc],
          },

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128],

          onHover: updateTooltip,
          onClick: onClick,
        }),
      );
    }
    if (data.surroundings) {
      _layers.push(
        new GeoJsonLayer({
          id: 'surroundings',
          data: data.surroundings,
          // opacity: 0.5,
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
              network_type,
            ),
          updateTriggers: {
            getFillColor: selected,
          },

          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 0, 128],

          onHover: updateTooltip,
          onClick: onClick,
        }),
      );
    }
    if (data.streets) {
      _layers.push(
        new GeoJsonLayer({
          id: 'streets',
          data: data.streets,
          getLineColor: [171, 95, 127],
          getLineWidth: 1,
          visible: visibility.streets,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip,
        }),
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
          getPointRadius: 3,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip,
        }),
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
          getPointRadius: 3,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip,
        }),
      );
    }
    if (data.trees) {
      _layers.push(
        new GeoJsonLayer({
          id: 'trees',
          data: data.trees,
          extruded: extruded,
          visible: visibility.trees,

          getElevation: (f) => f.properties['height_tc'],
          getFillColor: (f) => {
            if (selected.includes(f.properties['Name'])) {
              return [255, 255, 0, 255];
            }
            if (extruded)
              // Make trees more transparent in 3D due to the stacking of surface colors
              return [100, 225, 55, f.properties['density_la'] ** 1.55 * 255];
            else return [100, 225, 55, f.properties['density_la'] * 255];
          },
          pickable: true,
          getLineWidth: 0.1,

          updateTriggers: {
            getFillColor: [extruded, selected],
          },

          onHover: updateTooltip,
          onClick: onClick,
        }),
      );
    }
    return _layers;
  };

  const onDragStart = (info, event) => {
    if (!firstPitch.current && event.rightButton) {
      setExtruded(true);
      firstPitch.current = true;
    }
  };

  const onClick = ({ object, layer }, event) => {
    const name = object.properties['Name'];
    if (layer.id !== selectedLayer.current) {
      dispatch(setSelected([name]));
      selectedLayer.current = layer.id;
    } else {
      let index = -1;
      let newSelected = [...selected];
      if (
        (event.srcEvent.ctrlKey && event.leftButton) ||
        (event.srcEvent.metaKey && event.leftButton)
      ) {
        index = newSelected.findIndex((x) => x === name);
        if (index !== -1) {
          newSelected.splice(index, 1);
          dispatch(setSelected(newSelected));
        } else {
          newSelected.push(name);
          dispatch(setSelected(newSelected));
        }
      } else {
        dispatch(setSelected([name]));
      }
    }
  };

  const onNetworkChange = (value) => {
    setVisibility((oldValue) => ({
      ...oldValue,
      dc: value === 'dc',
      dh: value === 'dh',
    }));
  };

  useEffect(() => {
    setLayers(renderLayers());
  }, [data, visibility, extruded, selected]);

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <DeckGL
        viewState={viewState}
        controller={{ inertia: true }}
        layers={layers}
        onViewStateChange={({ viewState }) => {
          setViewState(viewState);
        }}
        onDragStart={onDragStart}
      >
        <Map
          ref={mapRef}
          mapStyle={mapStyle == 'labels' ? positron : no_label}
          onLoad={onMapLoad}
          minZoom={1}
        />
        <NetworkToggle
          cooling={data?.dc !== null}
          heating={data?.dh !== null}
          initialValue={
            data?.dc !== null ? 'dc' : data?.dh !== null ? 'dh' : null
          }
          onChange={onNetworkChange}
        />
        <LayerToggle data={data} setVisibility={setVisibility} />

        <div id="map-controls">
          <div style={{ display: 'flex', gap: 8 }}>
            <Switch
              size="small"
              defaultChecked
              onChange={(checked) => {
                setMapStyle(checked ? 'labels' : 'no_labels');
              }}
            />
            Show Map Labels
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Switch
              size="small"
              checked={extruded}
              onChange={(checked) => {
                setExtruded(checked);
              }}
            />
            Show 3D
          </div>
          <Button
            style={{ fontSize: 12 }}
            type="primary"
            size="small"
            block
            onClick={() => {
              setViewState((state) => ({
                ...state,
                pitch: 0,
                zoom: cameraOptions.current.zoom,
                bearing: cameraOptions.current.bearing,
                latitude: cameraOptions.current.center.lat,
                longitude: cameraOptions.current.center.lng,
              }));
            }}
          >
            Reset Camera
          </Button>
          <Button
            style={{ fontSize: 12 }}
            type="primary"
            size="small"
            block
            onClick={() => {
              setViewState((state) => ({
                ...state,
                bearing: 0,
              }));
            }}
          >
            Reset Compass
          </Button>
        </div>
      </DeckGL>
      <div id="map-tooltip"></div>
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

    if (layer.id === 'zone' || layer.id === 'surroundings') {
      innerHTML += `<div><b>Name</b>: ${properties.Name}</div><br />`;
      Object.keys(properties)
        .sort()
        .forEach((key) => {
          if (key != 'Name')
            innerHTML += `<div><b>${key}</b>: ${properties[key]}</div>`;
        });
      let area = Math.round(turf.area(object) * 1000) / 1000;
      innerHTML += `<br><div><b>Floor Area</b>: ${area}m<sup>2</sup></div>`;
      if (layer.id === 'zone')
        innerHTML += `<div><b>GFA</b>: ${
          Math.round(
            (properties['floors_ag'] + properties['floors_bg']) * area * 1000,
          ) / 1000
        }m<sup>2</sup></div>`;
    } else if (layer.id === 'dc' || layer.id === 'dh') {
      Object.keys(properties).forEach((key) => {
        if (key !== 'Building' && properties[key] === 'NONE') return null;
        innerHTML += `<div><b>${key}</b>: ${properties[key]}</div>`;
      });
      if (properties['Buildings']) {
        let length = turf.length(object) * 1000;
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
    return network === 'dc' ? colors.dc : network === 'dh' ? colors.dh : null;
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
  network_type,
) => {
  if (selected.includes(buildingName)) {
    return [255, 255, 0, 255];
  }
  if (layer === 'surroundings') return colors.surroundings;
  if (connectedBuildings.includes(buildingName)) return colors[network_type];
  return colors.disconnected;
};

export default DeckGLMap;

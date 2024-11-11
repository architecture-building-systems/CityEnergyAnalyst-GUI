import { useRef, useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer, PointCloudLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';

import positron from '../../constants/mapStyles/positron.json';
import no_label from '../../constants/mapStyles/positron_nolabel.json';

import * as turf from '@turf/turf';
import { setSelected } from '../../actions/inputEditor';
import './Map.css';

import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { COORDINATE_SYSTEM, FlyToInterpolator } from 'deck.gl';
import { useMapStore } from './store/store';
import {
  LEGEND_COLOUR_ARRAY,
  LEGEND_POINTS,
  SOLAR_IRRADIANCE,
  useGetMapLayers,
} from './Layers';
import Gradient from 'javascript-color-gradient';
import { hexToRgb } from './utils';

const useMapStyle = () => {
  const showMapStyleLabels = useMapStore((state) => state.mapLabels);

  return showMapStyleLabels ? positron : no_label;
};

const DeckGLMap = ({ data, colors }) => {
  const mapRef = useRef();
  const firstPitch = useRef(false);
  const cameraOptionsCalculated = useRef(false);

  const [selectedLayer, setSelectedLayer] = useState();

  const dispatch = useDispatch();
  const selected = useSelector((state) => state.inputData.selected);
  const connectedBuildings = useSelector(
    (state) => state.inputData.connected_buildings,
  );

  const viewState = useMapStore((state) => state.viewState);
  const setViewState = useMapStore((state) => state.setViewState);

  const extruded = useMapStore((state) => state.extruded);
  const setExtruded = useMapStore((state) => state.setExtruded);

  const setCameraOptions = useMapStore((state) => state.setCameraOptions);
  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);

  const visibility = useMapStore((state) => state.visibility);

  const range = useMapStore((state) => state.range);
  const filter = useMapStore((state) => state.filter);

  const mapStyle = useMapStyle();
  const mapLayers = useGetMapLayers();

  useEffect(() => {
    if (mapRef.current && data?.zone && !cameraOptionsCalculated.current) {
      const zoomToBounds = () => {
        const mapbox = mapRef.current.getMap();
        const zone = data?.zone;

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

        const cameraOptions = mapbox.cameraForBounds(turf.bbox(bboxPoly), {
          maxZoom: 16,
          padding: 8,
        });

        setCameraOptions(cameraOptions);
        setViewState((state) => ({
          ...state,
          zoom: cameraOptions.zoom,
          bearing: cameraOptions.bearing,
          latitude: cameraOptions.center.lat,
          longitude: cameraOptions.center.lng,
          transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
          transitionDuration: 1000,
        }));
      };
      zoomToBounds();
      cameraOptionsCalculated.current = true;
    } else if (!data?.zone) {
      // Reset camera options if no zone data is present
      resetCameraOptions();
      cameraOptionsCalculated.current = false;
    }
  }, [data, mapRef, resetCameraOptions, setCameraOptions, setViewState]);

  const layers = useMemo(() => {
    const onClick = ({ object, layer }, event) => {
      const name = object.properties['Name'];
      if (layer.id !== selectedLayer) {
        dispatch(setSelected([name]));
        setSelectedLayer(layer.id);
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

    const network_type = visibility.dc ? 'dc' : 'dh';
    let _layers = [];
    if (data?.zone) {
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
    if (data?.surroundings) {
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
    if (data?.streets) {
      _layers.push(
        new GeoJsonLayer({
          id: 'streets',
          data: data.streets,
          getLineColor: [171, 95, 127],
          getLineWidth: 0.75,
          visible: visibility.streets,

          pickable: true,
          autoHighlight: true,

          onHover: updateTooltip,
        }),
      );
    }
    if (data?.dc) {
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
    if (data?.dh) {
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
    if (data?.trees) {
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

    if (mapLayers[SOLAR_IRRADIANCE]) {
      const minParam = range[0];
      const maxParam = range[1];

      const gradientArray = new Gradient()
        .setColorGradient(...LEGEND_COLOUR_ARRAY)
        .setMidpoint(LEGEND_POINTS)
        .getColors();

      const getColor = ({ value }) => {
        const range = maxParam - minParam;
        const scale = range == 0 ? 0 : (value - minParam) / range;
        const colorIndex = Math.min(
          Math.floor(scale * (gradientArray.length - 1)),
          gradientArray.length - 1,
        );
        return hexToRgb(gradientArray[colorIndex]);
      };

      _layers.push(
        new PointCloudLayer({
          id: 'PointCloudLayer',
          data: mapLayers[SOLAR_IRRADIANCE].data,
          material: false,

          getColor: getColor,
          getPosition: (d) => d.position,
          pointSize: 1,
          sizeUnits: 'meters',

          coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
          pickable: true,

          getFilterValue: (d) => d.value,
          filterRange: filter,
          extensions: [new DataFilterExtension({ filterSize: 1 })],

          updateTriggers: {
            getColor: [range],
          },
        }),
      );
    }
    return _layers;
  }, [
    visibility,
    data,
    mapLayers,
    selectedLayer,
    dispatch,
    selected,
    extruded,
    colors,
    connectedBuildings,
    range,
    filter,
  ]);

  const onDragStart = (info, event) => {
    if (!firstPitch.current && event.rightButton) {
      setExtruded(true);
      firstPitch.current = true;
    }
  };

  return (
    <>
      <DeckGL
        viewState={viewState}
        controller={{ inertia: true }}
        layers={layers}
        onViewStateChange={({ viewState }) => {
          setViewState(viewState);
        }}
        onDragStart={onDragStart}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      >
        <Map ref={mapRef} mapStyle={mapStyle} minZoom={1} />
      </DeckGL>
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

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';

import { DeckGL } from '@deck.gl/react';
import {
  GeoJsonLayer,
  PointCloudLayer,
  PolygonLayer,
  TextLayer,
} from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';

import positron from 'constants/mapStyles/positron.json';
import no_label from 'constants/mapStyles/positron_nolabel.json';

import * as turf from '@turf/turf';
import './Map.css';

import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { COORDINATE_SYSTEM, FlyToInterpolator, HexagonLayer } from 'deck.gl';
import {
  useCameraOptionsCalulated,
  useMapStore,
} from 'features/map/stores/mapStore';
import { useShallow } from 'zustand/react/shallow';

import {
  DEMAND,
  SOLAR_IRRADIATION,
  RENEWABLE_ENERGY_POTENTIALS,
  THERMAL_NETWORK,
  EMISSIONS_EMBODIED,
  EMISSIONS_OPERATIONAL,
  DEFAULT_LEGEND_COLOUR_ARRAY,
  DEFAULT_LEGEND_POINTS,
} from 'features/map/constants';
import Gradient from 'javascript-color-gradient';
import { hexToRgb } from 'features/map/utils';

import { INDEX_COLUMN } from 'features/input-editor/constants';
import {
  useSelected,
  useSetSelectedFromMap,
} from 'features/input-editor/stores/inputEditorStore';
import { AttributionControl } from 'maplibre-gl';
import MapTooltip from './MapTooltip';

const useMapAttribution = (mapRef) => {
  // Effect to handle map attribution
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();

      // Check if AttributionControl already exists
      const hasAttributionControl = map._controls.some(
        (control) => control instanceof AttributionControl,
      );

      // Only add if it doesn't exist
      if (!hasAttributionControl) {
        map.addControl(new AttributionControl(), 'top-right');
      }
    }
  }, [mapRef.current]);
};

const useMapStyle = () => {
  const showMapStyleLabels = useMapStore((state) => state.mapLabels);

  return showMapStyleLabels ? positron : no_label;
};

const getLayerColours = (layer) => {
  const colours = layer?.properties?.['colours'];
  const colourArray = colours?.colour_array ?? DEFAULT_LEGEND_COLOUR_ARRAY;
  const points = colours?.points ?? DEFAULT_LEGEND_POINTS;

  const gradientArray = new Gradient()
    .setColorGradient(...colourArray)
    .setMidpoint(points)
    .getColors();

  const rgbGradientArray = gradientArray.map((hex) => hexToRgb(hex));

  return rgbGradientArray;
};

// Utility function to get min/max range of a property from GeoJSON features
const getPropertyRange = (features, propertyName) => {
  if (!features || features.length === 0) return { min: 0, max: 1 };

  const values = features
    .map((f) => f.properties?.[propertyName])
    .filter((val) => val != null && !isNaN(val));

  if (values.length === 0) return { min: 0, max: 1 };

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

// Normalize value to range with minimum width
const normalizeLineWidth = (value, min, max, minWidth = 1, maxWidth = 10) => {
  if (min === max) return minWidth;
  return minWidth + ((value - min) / (max - min)) * (maxWidth - minWidth);
};

const useMapLayers = (onHover = () => {}) => {
  const mapLayers = useMapStore((state) => state.mapLayers);
  const categoryLayers = useMapStore(
    (state) => state.selectedMapCategory?.layers,
  );

  const range = useMapStore((state) => state.range);
  const filters = useMapStore((state) => state.filters);
  const radius = filters?.radius ?? 10;
  const scale = filters?.scale ?? 1;

  const layers = useMemo(() => {
    let _layers = [];

    // Return early if no layers are selected
    if (!categoryLayers || mapLayers === null) return _layers;

    categoryLayers.forEach((layer) => {
      const { name } = layer;

      const rgbGradientArray = getLayerColours(mapLayers?.[name]);
      const getColor = (value, minParam, maxParam) => {
        const range = maxParam - minParam;
        const scale = range == 0 ? 0 : (value - minParam) / range;
        const colorIndex = Math.min(
          Math.floor(scale * (rgbGradientArray.length - 1)),
          rgbGradientArray.length - 1,
        );

        const hex = rgbGradientArray?.[colorIndex];
        return hex;
      };

      if (name == SOLAR_IRRADIATION && mapLayers?.[name]) {
        const minParam = range[0];
        const maxParam = range[1];

        const threshold = filters?.['range'];

        _layers.push(
          new PointCloudLayer({
            id: 'PointCloudLayer',
            data: mapLayers[name].data,
            material: {
              ambient: 0.65,
              specularColor: [0, 0, 0],
            },

            getColor: (d) => getColor(d.value, minParam, maxParam),
            getPosition: (d) => d.position,
            pointSize: 1,
            sizeUnits: 'meters',

            coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
            pickable: true,

            getFilterValue: (d) => d.value,
            filterRange: threshold,
            extensions: [new DataFilterExtension({ filterSize: 1 })],

            updateTriggers: {
              getColor: [range],
            },
          }),
        );
      }

      if (name == THERMAL_NETWORK && mapLayers?.[name]) {
        const colours = mapLayers[name].properties?.colours ?? {};

        const edgeColour = hexToRgb(colours?.edges) ?? [255, 255, 255];

        // Get min/max range for peak_mass_flow property
        const edgesData = mapLayers[name]?.edges;
        const { min, max } = getPropertyRange(
          edgesData?.features || edgesData,
          'peak_mass_flow',
        );

        const nodeFillColor = (type) => {
          if (type === 'NONE') {
            return edgeColour;
          } else if (type === 'CONSUMER') {
            return hexToRgb(colours?.nodes?.consumer) ?? [255, 255, 255];
          } else if (type === 'PLANT') {
            return hexToRgb(colours?.nodes?.plant) ?? [255, 255, 255];
          }
        };

        const nodeLineColor = (type) => {
          if (type === 'PLANT') {
            return [255, 255, 255];
          } else {
            return edgeColour;
          }
        };

        const nodeRadius = (type) => {
          if (type === 'NONE') {
            return 0;
          } else if (type === 'CONSUMER') {
            return 2;
          } else if (type === 'PLANT') {
            return 3;
          }
        };

        _layers.push(
          new GeoJsonLayer({
            id: `${name}-edges`,
            data: mapLayers[name]?.edges,
            getLineWidth: (f) =>
              normalizeLineWidth(
                f.properties['peak_mass_flow'],
                min,
                max,
                1,
                7 * scale,
              ),
            getLineColor: edgeColour,
            updateTriggers: {
              getLineWidth: [scale, min, max],
            },
            onHover: onHover,
            pickable: true,

            parameters: { depthTest: false },
          }),
        );

        _layers.push(
          new GeoJsonLayer({
            id: `${name}-nodes`,
            data: mapLayers[name]?.nodes,
            getFillColor: (f) => nodeFillColor(f.properties['type']),
            getPointRadius: (f) => nodeRadius(f.properties['type']),
            getLineColor: (f) => nodeLineColor(f.properties['type']),
            getLineWidth: 1,
            updateTriggers: {
              getPointRadius: [scale],
            },
            onHover: onHover,
            pickable: true,

            parameters: { depthTest: false },
          }),
        );
      }

      if (name == DEMAND && mapLayers?.[name]) {
        _layers.push(
          new HexagonLayer({
            id: `${name}-hex`,
            data: mapLayers[name].data,

            extruded: true,
            getPosition: (d) => d.position,
            getColorWeight: (d) => d.value,
            getElevationWeight: (d) => d.value,
            colorRange: rgbGradientArray,
            elevationScale: scale,
            radius: radius,
            elevationDomain: [range?.[0] ?? 0, range?.[1] ?? 0],
            updateTriggers: {
              getColor: [range],
            },
          }),
        );
      }

      if (name == RENEWABLE_ENERGY_POTENTIALS && mapLayers?.[name]) {
        _layers.push(
          new HexagonLayer({
            id: `${name}-hex`,
            data: mapLayers[name].data,

            extruded: true,
            getPosition: (d) => d.position,
            getColorWeight: (d) => d.value,
            getElevationWeight: (d) => d.value,
            colorRange: rgbGradientArray,
            elevationScale: scale,
            radius: radius,
            elevationDomain: range,
            updateTriggers: {
              getColor: [range],
            },
          }),
        );
      }

      if (
        [EMISSIONS_EMBODIED, EMISSIONS_OPERATIONAL].includes(name) &&
        mapLayers?.[name]
      ) {
        _layers.push(
          new HexagonLayer({
            id: `${name}-hex`,
            data: mapLayers[name].data,

            extruded: true,
            getPosition: (d) => d.position,
            getColorWeight: (d) => d.value,
            getElevationWeight: (d) => d.value,
            colorRange: rgbGradientArray,
            elevationScale: scale,
            radius: radius,
            elevationDomain: [range?.[0] ?? 0, range?.[1] ?? 0],
            updateTriggers: {
              getColor: [range],
            },
          }),
        );
      }
    });

    return _layers;
  }, [filters, mapLayers, range, categoryLayers, scale]);

  return layers;
};

const DeckGLMap = ({ data, colors }) => {
  const mapRef = useRef();
  const firstPitch = useRef(false);

  const [selectedLayer, setSelectedLayer] = useState();
  const [tooltipInfo, setTooltipInfo] = useState(null);

  const selected = useSelected();
  const setSelected = useSetSelectedFromMap();

  const viewState = useMapStore(useShallow((state) => state.viewState));
  const setViewState = useMapStore((state) => state.setViewState);

  const extruded = useMapStore((state) => state.extruded);
  const setExtruded = useMapStore((state) => state.setExtruded);

  const setCameraOptions = useMapStore((state) => state.setCameraOptions);
  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);
  const cameraOptionsCalulated = useCameraOptionsCalulated();

  const visibility = useMapStore((state) => state.visibility);

  const mapStyle = useMapStyle();
  useMapAttribution(mapRef);

  const buildingColor = useMemo(
    () => buildingColorFunction(colors, selected),
    [colors, selected],
  );

  const updateTooltip = useCallback((feature) => {
    setTooltipInfo(feature.object ? feature : null);
  }, []);

  const calculateCameraOptions = useCallback(() => {
    if (!mapRef.current) {
      console.error('Map ref not found');
      return;
    }
    const mapbox = mapRef.current.getMap();

    // Calculate total bounds with other geometries
    let bboxPoly = turf.bboxPolygon(turf.bbox(data.zone));

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

    console.log('Camera options calculated:', cameraOptions);
    setCameraOptions(cameraOptions);
    setViewState({
      ...viewState,
      zoom: cameraOptions.zoom,
      bearing: cameraOptions.bearing,
      latitude: cameraOptions.center.lat,
      longitude: cameraOptions.center.lng,
      transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
      transitionDuration: 1000,
    });
  }, [data]);

  useEffect(() => {
    if (!data?.zone) resetCameraOptions();
    else if (mapRef.current && !cameraOptionsCalulated) {
      console.log('Calculating camera options');
      calculateCameraOptions();
    }
  }, [cameraOptionsCalulated, data?.zone, mapRef]);

  const dataLayers = useMemo(() => {
    const onClick = ({ object, layer }, event) => {
      const name = object.properties[INDEX_COLUMN];
      if (layer.id !== selectedLayer) {
        setSelected([name]);
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
            setSelected(newSelected);
          } else {
            newSelected.push(name);
            setSelected(newSelected);
          }
        } else {
          setSelected([name]);
        }
      }
    };

    let _zoneLayers = [];
    let _surroundingLayers = [];
    let _streetLayers = [];
    let _treeLayers = [];
    let _textLayers = [];

    if (data?.zone) {
      _zoneLayers.push(
        new PolygonLayer({
          id: 'zone',
          data: data.zone?.features,
          opacity: 0.8,
          wireframe: true,
          filled: true,
          extruded: extruded,
          visible: visibility.zone,

          material: {
            specularColor: [0, 0, 0],
          },

          getPolygon: calcPolygonWithZ,
          getElevation: (f) => (extruded ? calcPolygonElevation(f) : 0),
          getFillColor: (f) =>
            buildingColor(f.properties[INDEX_COLUMN], 'zone'),
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

      _textLayers.push(
        new TextLayer({
          id: 'zone-labels',
          data: data.zone?.features,
          visible: visibility.zone_labels ?? true,
          pickable: false,
          getPosition: (f) => {
            const centroid = turf.centroid(f);
            const height = extruded
              ? Number(f.properties?.height_ag ?? 0)
              : // Lift label above void deck if exists when not extruded
                Number(f.properties?.void_deck ?? 0) * VOID_DECK_FLOOR_HEIGHT;
            return [...centroid.geometry.coordinates, height + 3];
          },
          sizeUnits: 'meters',

          getText: (f) => f.properties[INDEX_COLUMN],
          getSize: 4,
          sizeMinPixels: 8,
          updateTriggers: {
            getPosition: [extruded],
          },
        }),
      );
    }
    if (data?.surroundings) {
      _surroundingLayers.push(
        new GeoJsonLayer({
          id: 'surroundings',
          data: data.surroundings,
          // opacity: 0.5,
          wireframe: true,
          filled: true,
          extruded: extruded,
          visible: visibility.surroundings,

          material: {
            specularColor: [0, 0, 0],
          },

          getElevation: (f) => f.properties['height_ag'],
          getFillColor: (f) =>
            buildingColor(f.properties[INDEX_COLUMN], 'surroundings'),
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
      _streetLayers.push(
        new GeoJsonLayer({
          id: 'streets',
          data: data.streets,
          getLineColor: [171, 95, 127],
          getLineWidth: 0.5,
          visible: visibility.streets,

          // pickable: true,
          // autoHighlight: true,

          onHover: updateTooltip,
        }),
      );
    }
    if (data?.trees) {
      _treeLayers.push(
        new GeoJsonLayer({
          id: 'trees',
          data: data.trees,
          extruded: extruded,
          visible: visibility.trees,

          getElevation: (f) => f.properties['height_tc'],
          getFillColor: (f) => {
            if (selected.includes(f.properties[INDEX_COLUMN])) {
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

    return {
      zoneLayers: _zoneLayers,
      surroundingLayers: _surroundingLayers,
      streetLayers: _streetLayers,
      treeLayers: _treeLayers,
      textLayers: _textLayers,
    };
  }, [
    visibility,
    data,
    selectedLayer,
    selected,
    extruded,
    buildingColor,
    setSelected,
    updateTooltip,
  ]);

  const mapLayers = useMapLayers(updateTooltip);

  // Layer ordering: streets -> surroundings -> zone -> trees -> data layers (network, etc.) -> text labels
  // This ensures network and other data layers render on top of buildings when extruded
  const layers = [
    ...dataLayers.streetLayers,
    ...dataLayers.zoneLayers,
    ...mapLayers,
    ...dataLayers.surroundingLayers,
    ...dataLayers.treeLayers,
    ...dataLayers.textLayers,
  ];

  const onDragStart = useCallback(
    (_, event) => {
      if (!firstPitch.current && event.rightButton) {
        setExtruded(true);
        firstPitch.current = true;
      }
    },
    [setExtruded],
  );

  const _onViewStateChange = useCallback(
    ({ viewState }) => {
      setViewState(viewState);
    },
    [setViewState],
  );

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <>
      <DeckGL
        viewState={viewState}
        controller={{ inertia: true }}
        layers={layers}
        onViewStateChange={_onViewStateChange}
        onDragStart={onDragStart}
        onContextMenu={onContextMenu}
      >
        <Map
          ref={mapRef}
          mapStyle={mapStyle}
          minZoom={1}
          attributionControl={false} // Disable default attribution control
        />
      </DeckGL>
      <MapTooltip info={tooltipInfo} />
    </>
  );
};

const buildingColorFunction = (colors, selected) => (buildingName, layer) => {
  if (selected.includes(buildingName)) {
    return [255, 255, 0, 255];
  }
  if (layer === 'surroundings') return colors.surroundings;

  return colors.disconnected;
};

const VOID_DECK_FLOOR_HEIGHT = 3;

const calcPolygonWithZ = (feature) => {
  const name = feature?.properties?.[INDEX_COLUMN];
  const coords = feature?.geometry?.coordinates ?? [];

  if (name === null) return coords;

  const voidDeckFloors = Number(feature?.properties?.void_deck ?? 0);
  return coords.map((coord) =>
    coord.map((c) => [c[0], c[1], voidDeckFloors * VOID_DECK_FLOOR_HEIGHT]),
  );
};

const calcPolygonElevation = (feature) => {
  const name = feature?.properties?.[INDEX_COLUMN];
  const height_ag = Number(feature?.properties?.height_ag ?? 0);

  if (name === null) return height_ag;

  const voidDeckFloors = Number(feature?.properties?.void_deck ?? 0);

  // Prevent negative elevation, which causes buildings to appear higher than height_ag
  return Math.max(height_ag - voidDeckFloors * VOID_DECK_FLOOR_HEIGHT, 0);
};

export default DeckGLMap;

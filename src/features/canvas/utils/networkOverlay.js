import { GeoJsonLayer } from '@deck.gl/layers';

import { hexToRgb } from 'features/map/utils';

/**
 * A pathway state's thermal networks drawn as a summary overlay on a canvas map: pipe layout
 * and plants in each network type's colour, no results colouring.
 *
 * DC and DH share one pipe trench wherever a building takes both (network-layout builds one
 * layout and splits it per service), so their pipes coincide. DH is drawn wide underneath and
 * DC thin on top -- a shared trench reads as blue edged in red, a single service in its own
 * colour.
 */
export const NETWORK_TYPES = ['DH', 'DC'];

export const NETWORK_LABELS = {
  DH: 'District Heating',
  DC: 'District Cooling',
};

// Visibility key in the map stores' `visibility`; unset means shown.
export const networkVisibilityKey = (type) => `network_${type}`;

/** The types `networks` (`{ DH, DC }`) has a network for. */
export const availableNetworkTypes = (networks) =>
  NETWORK_TYPES.filter((type) => networks?.[type]);

/** The available types not hidden in `visibility`, DH first. */
export const visibleNetworkTypes = (networks, visibility = {}) =>
  availableNetworkTypes(networks).filter(
    (type) => visibility[networkVisibilityKey(type)] !== false,
  );

const EDGE_WIDTH_PX = { DH: 6, DC: 2.5 };
const FALLBACK_COLOUR = { DH: [240, 77, 91], DC: [20, 113, 176] };

export const networkColour = (network, type) => {
  const hex = network?.properties?.colours?.edges;
  return hex ? hexToRgb(hex) : FALLBACK_COLOUR[type];
};

const isPlant = (feature) => feature.properties?.type?.startsWith('PLANT');

/**
 * deck.gl layers for `networks` (`{ DH, DC }`, each a `thermal-network` map-layer output or
 * null), skipping types hidden in `visibility`. DH first, so it sits underneath.
 */
export const networkOverlayLayers = (networks, visibility = {}) =>
  visibleNetworkTypes(networks, visibility).flatMap((type) => {
    const network = networks[type];
    const colour = networkColour(network, type);
    const plants = (network.nodes?.features ?? []).filter(isPlant);
    return [
      new GeoJsonLayer({
        id: `state-network-${type}-edges`,
        data: network.edges,
        getLineColor: colour,
        getLineWidth: EDGE_WIDTH_PX[type],
        lineWidthUnits: 'pixels',
        parameters: { depthTest: false },
      }),
      new GeoJsonLayer({
        id: `state-network-${type}-plants`,
        data: { type: 'FeatureCollection', features: plants },
        getFillColor: colour,
        getLineColor: [255, 255, 255],
        getPointRadius: 6,
        pointRadiusUnits: 'pixels',
        getLineWidth: 1.5,
        lineWidthUnits: 'pixels',
        parameters: { depthTest: false },
      }),
    ];
  });

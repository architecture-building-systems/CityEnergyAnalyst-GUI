import * as turf from '@turf/turf';

// Initial viewport settings
export const defaultViewState = {
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0,
};

export const EMPTY_FEATURE = {
  type: 'FeatureCollection',
  features: [],
};

export const calcPolyArea = (geojson) => {
  const poly = geojson.features[0]?.geometry?.coordinates;
  if (typeof poly === 'undefined') return 0;
  const site = turf.polygon(geojson.features[0].geometry.coordinates);
  // convert area from m^2 to km^2
  const area = (turf.area(site) / 1000000).toFixed(2);

  return area;
};

export const calcBoundsAndCenter = (geojson) => {
  if (geojson?.features?.length) {
    const boundingbox = turf.bbox(geojson);
    const centroid = turf.center(geojson);
    const coord = turf.getCoord(centroid);

    return {
      boundingbox,
      longitude: coord[0],
      latitude: coord[1],
    };
  }
};

export const hexToRgb = (hex) => {
  // Remove the hash at the start if it's there
  hex = hex.replace(/^#/, '');

  // If it's a 3-digit hex code, convert it to 6-digit
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  // Convert hex to RGB
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Return the RGB values as an array
  return [r, g, b];
};

export const formatNumber = (value) => {
  return value.toLocaleString('en-US').replace(/,/g, "'");
};

export const hexToRGBAList = (hexCodes) => {
  return hexCodes.map((hex) => {
    // Normalize the hex string by removing the "#" if present
    let cleanHex = hex.replace('#', '');

    // Depending on the length of the hex code, parse it accordingly
    if (cleanHex.length === 3) {
      // Shorthand hex format (#RGB)
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return [r, g, b, 255]; // Default alpha to 1
    } else if (cleanHex.length === 6) {
      // Standard hex format (#RRGGBB)
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      return [r, g, b, 255]; // Default alpha to 1
    } else if (cleanHex.length === 8) {
      // Hex format with alpha (#RRGGBBAA)
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      const a = parseInt(cleanHex.slice(6, 8), 16) / 255; // Convert alpha to [0, 1]
      return [r, g, b, a];
    } else {
      throw new Error(`Invalid hex code: ${hex}`);
    }
  });
};

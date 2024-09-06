import * as turf from '@turf/turf';

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

import { area as calcArea, polygon } from '@turf/turf';

export const calcPolyArea = (geojson) => {
  const poly = geojson.features[0]?.geometry?.coordinates;
  if (typeof poly === 'undefined') return 0;
  const site = polygon(geojson.features[0].geometry.coordinates);
  // convert area from m^2 to km^2
  const area = (calcArea(site) / 1000000).toFixed(2);

  return area;
};

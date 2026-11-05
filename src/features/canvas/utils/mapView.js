/**
 * A map's view toggles -- building colours, map labels, layer visibility, 3D extrusion -- as
 * saved with a canvas: per map card (`card.mapView`), for the overview map
 * (`canvasStore.mapView`) and per pathway-multi row (`canvasStore.pathwayMultiMapViews`).
 * Same keys as the map stores (`mapStore`, `createMapInstanceStore`), so a saved view applies
 * with a plain `setState`.
 */
export const MAP_VIEW_KEYS = [
  'colorMode',
  'mapLabels',
  'visibility',
  'extruded',
];

export const pickMapView = (state) =>
  Object.fromEntries(MAP_VIEW_KEYS.map((key) => [key, state[key]]));

const sameVisibility = (a = {}, b = {}) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
};

export const sameMapView = (a, b) =>
  a === b ||
  (a != null &&
    b != null &&
    a.colorMode === b.colorMode &&
    a.mapLabels === b.mapLabels &&
    a.extruded === b.extruded &&
    sameVisibility(a.visibility, b.visibility));

/** Whether any view toggle differs between two store states (a cheap reference check). */
export const mapViewChanged = (state, prev) =>
  MAP_VIEW_KEYS.some((key) => state[key] !== prev[key]);

/**
 * Make `followers` copy `keys` from `leader` now and on every change. Returns the unsubscribe.
 * For map stores that are not linked through the singleton (pathway-multi rows).
 */
export const linkMapStores = (leader, followers, keys) => {
  const follow = (state) => {
    const sync = Object.fromEntries(keys.map((key) => [key, state[key]]));
    followers.forEach((store) => store.setState(sync));
  };
  follow(leader.getState());
  return leader.subscribe((state, prev) => {
    if (keys.some((key) => state[key] !== prev[key])) follow(state);
  });
};

export const serializeMapView = (view) =>
  view
    ? {
        color_mode: view.colorMode,
        map_labels: view.mapLabels,
        visibility: view.visibility,
        extruded: view.extruded,
      }
    : null;

export const deserializeMapView = (view) =>
  view
    ? {
        colorMode: view.color_mode,
        mapLabels: view.map_labels,
        visibility: view.visibility ?? {},
        extruded: view.extruded,
      }
    : null;

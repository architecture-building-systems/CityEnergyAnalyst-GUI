import MapLayerPropertiesCard from 'features/project/components/Cards/MapLayersCard/MapLayerPropertiesCard';

/**
 * Bottom card — hosts the map-layer properties form for Reports.
 *
 * No category picker here — we only mount `MapLayerPropertiesCard`,
 * which renders itself only when a map category is active (it reads
 * `useSelectedMapCategoryInfo` internally and returns `null`
 * otherwise). The active category must be set via some other path
 * (e.g. auto-selected from the current plot script).
 *
 * `hideLegend` skips the Legend column inside `MapLayerPropertiesCard`
 * per the "no legend card" requirement.
 *
 * Path C caveat: `useMapStore` is a singleton — layer selection made
 * here also affects the main viewport on next visit.
 */
const BottomCard = () => (
  // `hideLayerSelector`: the intra-category layer dropdown (the
  // "title dropdown" for LCA, which switches between energy-by-
  // carrier / emissions / costs / heat-rejection layers) is
  // redundant in Reports — `PlotEditModal` writes `selectedMapLayer`
  // directly based on the plot script being edited. Non-LCA
  // categories only have one layer, so this selector auto-hides
  // there regardless. No other dropdowns are filtered — the full
  // parameter form is shown.
  <MapLayerPropertiesCard hideLegend hideLayerSelector />
);

export default BottomCard;

import { useCallback, useEffect, useState } from 'react';

import { useMapLayerCategories } from 'features/project/components/Cards/MapLayersCard/store';
import Legend, {
  LegendFilterRow,
} from 'features/map/components/Map/Layers/Legend';
import { iconMap } from 'features/plots/constants';

import ReportMap from './ReportMap';
import { FeatureCardShell, sectionDividerStyle } from './featureCardCommon';
import {
  MapInstanceContext,
  createMapInstanceStore,
  registerMapCardStore,
  unregisterMapCardStore,
} from './mapInstance';

/**
 * Map-only feature card. Renders the column's `<ReportMap>` widget
 * (same DeckGL map + 4-button toolbar suite as the primary map tile)
 * bound to a specific category + layer. The properties form launches
 * at the page bottom — same pattern Plot cards use.
 *
 * Owns a per-card `mapInstance` store seeded with the card's category
 * and layer; the store is published in the registry so `BottomCard`
 * can wrap its `MapLayerPropertiesCard` in the matching provider when
 * this card is the active edit target. See `mapInstance.js` for the
 * scoped read/write surface.
 */
const FeatureCardMap = ({
  card,
  project,
  scenario,
  onOpenBottom,
  onDeleteCard,
}) => {
  const { id, category, layer } = card;
  const data = useMapLayerCategories();

  // `useState` lazy initializer keeps the store stable across renders
  // without the unsafe `useRef`-mutate-during-render pattern.
  const [store] = useState(() => createMapInstanceStore({ category, layer }));
  useEffect(() => {
    const { setCategory, setSelectedMapLayer: setLayer } = store.getState();
    setCategory(category);
    setLayer(layer);
  }, [store, category, layer]);

  useEffect(() => {
    registerMapCardStore(id, store);
    return () => unregisterMapCardStore(id);
  }, [id, store]);

  const handleEdit = useCallback(() => {
    onOpenBottom?.(id);
  }, [onOpenBottom, id]);

  const categoryInfo = data?.categories?.find((c) => c.name === category);
  const layerInfo = categoryInfo?.layers?.find((l) => l.name === layer);
  const title = layerInfo?.label || categoryInfo?.label || category || 'Map';
  const Icon = iconMap[category];

  return (
    <MapInstanceContext.Provider value={store}>
      <FeatureCardShell
        title={title}
        icon={Icon}
        onEdit={onOpenBottom ? handleEdit : undefined}
        onDeleteCard={onDeleteCard}
      >
        <div style={sectionDividerStyle} />
        <div style={mapBodyStyle}>
          <ReportMap project={project} scenario={scenario} />
        </div>
        <div style={legendBodyStyle}>
          <Legend
            style={legendOverrideStyle}
            extras={layerInfo ? <LegendFilterRow layers={[layerInfo]} /> : null}
          />
        </div>
      </FeatureCardShell>
    </MapInstanceContext.Provider>
  );
};

const mapBodyStyle = {
  flex: 1,
  minHeight: 0,
  position: 'relative',
};

// Hosts the Legend below the map. Width spans the card; height grows
// with the legend's own content (no `flex: 1` so the map keeps the
// remaining space).
const legendBodyStyle = {
  marginTop: 12,
  width: '100%',
};

// Override Legend's sidebar defaults: span the full card width and
// drop the card chrome (shadow + opaque background) so the legend
// reads as part of the FeatureCardMap surface, not its own card.
const legendOverrideStyle = {
  width: '100%',
  marginRight: 0,
  boxShadow: 'none',
  backgroundColor: 'transparent',
  padding: 0,
};

export default FeatureCardMap;

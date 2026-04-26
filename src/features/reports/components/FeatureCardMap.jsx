import { useCallback, useEffect, useRef, useState } from 'react';

import { useMapStore } from 'features/map/stores/mapStore';
import { useMapLayerCategories } from 'features/project/components/Cards/MapLayersCard/store';
import Legend, {
  LegendFilterRow,
} from 'features/map/components/Map/Layers/Legend';
import { iconMap } from 'features/plots/constants';

import { useReportsStore } from '../stores/reportsStore';
import ReportMap from './ReportMap';
import { FeatureCardShell, sectionDividerStyle } from './featureCardCommon';
import {
  MapInstanceContext,
  createMapInstanceStore,
  registerMapCardStore,
  unregisterMapCardStore,
} from './mapInstance';

// Singleton fields whose snapshot we copy into each per-card store
// at two moments: (a) when a new card mounts so it inherits the
// overview map's current view, and (b) when the user flips
// `mapsLinked` from on → off so every existing card continues from
// the overview map's current view instead of jumping to the per-
// card defaults. Mirrored back during the on-state via the scoped
// hooks.
const VIEW_STATE_KEYS = [
  'viewState',
  'cameraOptions',
  'extruded',
  'visibility',
  'mapLabels',
  'colorMode',
  'filters',
];

const snapshotViewState = () => {
  const singleton = useMapStore.getState();
  const seed = {};
  for (const key of VIEW_STATE_KEYS) seed[key] = singleton[key];
  return seed;
};

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
  editing = false,
}) => {
  const { id, category, layer } = card;
  const data = useMapLayerCategories();

  // `useState` lazy initializer keeps the store stable across renders
  // without the unsafe `useRef`-mutate-during-render pattern. Seeded
  // with the singleton's current view-state so a card mounted while
  // `mapsLinked === false` inherits the overview map's view (camera,
  // zoom, layer toggles, …) instead of opening at default world.
  const [store] = useState(() => {
    const s = createMapInstanceStore({ category, layer });
    s.setState(snapshotViewState());
    return s;
  });
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

  // Hide the in-card 4-button toolbar when "Sync Maps" is on — the
  // overview map is the sole driver in that mode.
  const mapsLinked = useReportsStore((s) => s.mapsLinked);

  // On the linked → unlinked transition, refresh the per-card view-
  // state from the singleton snapshot so cards continue from the
  // overview map's current view. The reverse transition needs no
  // work — scoped hooks read the singleton directly while linked,
  // so per-card values are dormant.
  const previouslyLinkedRef = useRef(mapsLinked);
  useEffect(() => {
    if (previouslyLinkedRef.current && !mapsLinked) {
      store.setState(snapshotViewState());
    }
    previouslyLinkedRef.current = mapsLinked;
  }, [mapsLinked, store]);

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
        editing={editing}
      >
        <div style={sectionDividerStyle} />
        <div style={mapBodyStyle}>
          <ReportMap
            project={project}
            scenario={scenario}
            showToolbar={!mapsLinked}
          />
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

import { useCallback, useEffect, useState } from 'react';

import { useMapStore } from 'features/map/stores/mapStore';
import {
  useMapLayerCategories,
  useSetActiveMapCategory,
} from 'features/project/components/Cards/MapLayersCard/store';
import { iconMap } from 'features/plots/constants';

import ReportMap from './ReportMap';
import { FeatureCardShell, sectionDividerStyle } from './featureCardCommon';
import { MapInstanceContext, createMapInstanceStore } from './mapInstance';

/**
 * Map-only feature card. Holds a `category` + `layer` reference
 * (selected via the `+` picker's nested map menu) and renders the
 * column's `<ReportMap>` widget — same DeckGL map + 4-button
 * toolbar suite (Layers / 3D / Camera / Compass) as the column's
 * primary map tile.
 *
 * The properties form launches at the bottom (not inline) — same
 * pattern Plot cards use to host their parameter form.
 *
 * Per-card map store: each instance owns a fresh zustand store via
 * `createMapInstanceStore` and provides it through
 * `<MapInstanceContext>` so layer-state consumers nested under the
 * card (`MapLayerPropertiesCard`, `useGetMapLayers`) can read/write
 * scoped to this card. Main viewport / `BottomCard` are untouched
 * because the scoped hooks fall back to the singleton when no
 * provider is in scope.
 *
 * The singleton-sync effect remains as a temporary bridge: until
 * `BottomCard` is wired to the active card's Provider (Phase 4),
 * the bottom-of-page `MapLayerPropertiesCard` still reads/writes
 * the singleton, so the singleton must point to this card's
 * category/layer for the bottom form to drive the right map.
 *
 * Props:
 *   card           — { id, category, layer }
 *   project, scenario — passed through to ReportMap
 *   onOpenBottom() — open the page-level MapLayerProperties bottom
 *   onDeleteCard()
 */
const FeatureCardMap = ({
  card,
  project,
  scenario,
  onOpenBottom,
  onDeleteCard,
}) => {
  const { category, layer } = card;
  const data = useMapLayerCategories();
  const setActiveCategory = useSetActiveMapCategory();
  const setSelectedMapLayer = useMapStore((s) => s.setSelectedMapLayer);

  // One zustand store per FeatureCardMap instance. `useState`'s lazy
  // initializer creates it on first render and the same instance is
  // returned on every subsequent render — without the unsafe
  // `useRef`-mutate-during-render pattern. Seeded with the card's
  // initial category/layer; if either prop changes (rare — cards
  // are typically static after creation) the effect below syncs
  // the store to match.
  const [store] = useState(() => createMapInstanceStore({ category, layer }));
  useEffect(() => {
    const { setCategory, setSelectedMapLayer: setLayer } = store.getState();
    setCategory(category);
    setLayer(layer);
  }, [store, category, layer]);

  // Phase 3 bridge — push this card's category/layer to the
  // singletons so the page-level BottomCard's MapLayerPropertiesCard
  // (still on the singleton path) drives the right card. Goes away
  // when Phase 4 wraps BottomCard in this card's Provider.
  const syncSingleton = useCallback(() => {
    setActiveCategory(category);
    setSelectedMapLayer(layer);
  }, [category, layer, setActiveCategory, setSelectedMapLayer]);
  useEffect(() => {
    syncSingleton();
  }, [syncSingleton]);

  const handleEdit = useCallback(() => {
    syncSingleton();
    onOpenBottom?.();
  }, [syncSingleton, onOpenBottom]);

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
      </FeatureCardShell>
    </MapInstanceContext.Provider>
  );
};

const mapBodyStyle = {
  flex: 1,
  minHeight: 0,
  position: 'relative',
};

export default FeatureCardMap;

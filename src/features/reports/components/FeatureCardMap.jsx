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
 * Per-card map store (Phase 2 of the multi-state refactor):
 * each instance owns a fresh zustand store via
 * `createMapInstanceStore` and provides it through
 * `<MapInstanceContext>` so descendants can scope reads/writes
 * to this card. Phase 2 only sets up the provider — consumers
 * still use the singleton for now (the singleton-sync useEffect
 * below stays in place until Phase 3 routes them through the
 * context).
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

import { useCallback, useEffect, useState } from 'react';

import { useMapLayerCategories } from 'features/project/components/Cards/MapLayersCard/store';
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
 * `<MapInstanceContext>` so the in-card map's deck.gl feed and
 * any scoped consumer rendered under this provider read/write
 * this card's own layer state. The store is also registered in
 * the page-level registry so `BottomCard` can wrap its own
 * `MapLayerPropertiesCard` in the matching provider when this
 * card is the active edit target.
 *
 * Props:
 *   card           — { id, category, layer }
 *   project, scenario — passed through to ReportMap
 *   onOpenBottom(cardId) — open the page-level MapLayerProperties
 *                          bottom for this card
 *   onDeleteCard()
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

  // Publish the store under this card's id so `BottomCard` can look
  // it up via `useMapCardStore(activeMapCardId)`.
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

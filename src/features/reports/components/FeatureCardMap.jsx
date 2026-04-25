import { useCallback, useEffect } from 'react';

import { useMapStore } from 'features/map/stores/mapStore';
import {
  useMapLayerCategories,
  useSetActiveMapCategory,
} from 'features/project/components/Cards/MapLayersCard/store';
import { iconMap } from 'features/plots/constants';

import ReportMap from './ReportMap';
import { FeatureCardShell, sectionDividerStyle } from './featureCardCommon';

/**
 * Map-only feature card. Holds a `category` + `layer` reference
 * (selected via the `+` picker's nested map menu) and renders the
 * column's `<ReportMap>` widget — same DeckGL map + 4-button
 * toolbar suite (Layers / 3D / Camera / Compass) as the column's
 * primary map tile, reflecting whatever the user configures in
 * `MapLayerPropertiesCard` at the bottom of the page.
 *
 * The properties form launches at the bottom (not inline) — same
 * pattern Plot cards use to host their parameter form.
 *
 * Mount: pushes this card's category + layer into the singleton map
 * stores so the rendered overlay matches the card. Edit click:
 * re-pushes the singleton (in case another card has overwritten it)
 * and tells the parent to open the bottom.
 *
 * Path-C limitation: `useMapStore` + `useMapCategoryStore` are
 * singletons, so multiple Map cards in the same column will all
 * render the same active layer's overlay until per-card state is
 * threaded through. Same tradeoff Reports already accepts for the
 * primary map tile and `MapLayerPropertiesCard`.
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
  );
};

const mapBodyStyle = {
  flex: 1,
  minHeight: 0,
  position: 'relative',
};

export default FeatureCardMap;

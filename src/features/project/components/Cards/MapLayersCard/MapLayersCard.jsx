import { Tooltip } from 'antd';

import { useEffect } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';
import { GraphsIcon } from 'assets/icons';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useActiveMapCategory, useSetActiveMapCategory } from './store';
import { iconMap } from 'features/plots/constants';

const MapLayerCategoriesCard = ({ mapLayerCategories }) => {
  const scenarioName = useProjectStore((state) => state.scenario);
  const active = useActiveMapCategory();
  const setActive = useSetActiveMapCategory();

  const setSelectedMapCategory = useMapStore(
    (state) => state.setSelectedMapCategory,
  );

  const handleLayerSelected = (layer) => {
    setSelectedMapCategory(layer);
    if (onLayerSelected) onLayerSelected?.(layer?.name);
  };

  const toggleActive = (category) => {
    setActive(active == category ? null : category);
  };

  // Reset active layer when scenario changes
  useEffect(() => {
    setActive(null);
  }, [scenarioName]);

  useEffect(() => {
    if (active == null) {
      handleLayerSelected(null);
    } else {
      const layers = mapLayerCategories?.categories?.find(
        (l) => l.name == active,
      );
      handleLayerSelected(layers);
    }
  }, [active]);

  if (!scenarioName) return null;

  return (
    <div
      className="cea-overlay-card cea-card-toolbar-icon-container inverted"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',
        height: '100%',

        display: 'flex',
        alignItems: 'center',
        gap: 4,

        fontSize: 12,

        paddingInline: 8,
      }}
    >
      {mapLayerCategories?.categories?.map((category) => {
        const { name, label } = category;
        return (
          <CategoryIconButton
            key={name}
            onClick={toggleActive}
            category={name}
            label={label}
            active={active == name}
          />
        );
      })}
    </div>
  );
};

const CategoryIconButton = ({ category, label, onClick, active }) => {
  const _icon = iconMap?.[category] || GraphsIcon;
  const style = active
    ? {
        color: 'white',
        backgroundColor: '#ac6080',
      }
    : {
        color: 'black',
      };

  const handleClick = () => {
    onClick?.(category);
  };

  return (
    <Tooltip title={label || category} styles={{ body: { fontSize: 12 } }}>
      <button
        className={`cea-card-toolbar-icon ${active ? 'active' : ''}`}
        style={style}
        onClick={handleClick}
        type="button"
      >
        <_icon />
      </button>
    </Tooltip>
  );
};

export default MapLayerCategoriesCard;

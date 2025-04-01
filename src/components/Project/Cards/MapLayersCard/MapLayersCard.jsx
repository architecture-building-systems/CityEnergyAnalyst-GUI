import { Tooltip } from 'antd';

import { useEffect, useState } from 'react';
import { useMapStore } from '../../../Map/store/store';
import {
  SolarRadiationIcon,
  GraphsIcon,
  NetworksIcon,
  PlugInIcon,
  EnergyPotentialsIcon,
  LifeCycleAnalysisIcon,
} from '../../../../assets/icons';
import {
  DEMAND,
  SOLAR_IRRADIATION,
  RENEWABLE_ENERGY_POTENTIALS,
  THERMAL_NETWORK,
  LIFE_CYCLE_ANALYSIS,
} from '../../../Map/Layers/constants';
import { useGetMapLayerCategories } from '../../../Map/Layers/hooks';
import { useProjectStore } from '../../store';

const MapLayersCard = ({ onLayerSelected }) => {
  const scenarioName = useProjectStore((state) => state.scenario);
  const [active, setActive] = useState(null);
  const setSelectedMapCategory = useMapStore(
    (state) => state.setSelectedMapCategory,
  );

  const handleLayerSelected = (layer) => {
    setSelectedMapCategory(layer);
    onLayerSelected?.(layer);
  };

  const mapLayerCategories = useGetMapLayerCategories();

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
      className="cea-overlay-card"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',
        height: '100%',

        display: 'flex',
        alignItems: 'center',

        fontSize: 12,
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

const iconMap = {
  [SOLAR_IRRADIATION]: SolarRadiationIcon,
  [THERMAL_NETWORK]: NetworksIcon,
  [DEMAND]: PlugInIcon,
  [RENEWABLE_ENERGY_POTENTIALS]: EnergyPotentialsIcon,
  [LIFE_CYCLE_ANALYSIS]: LifeCycleAnalysisIcon,
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
    <Tooltip title={label || category} overlayInnerStyle={{ fontSize: 12 }}>
      <_icon
        className={`cea-card-toolbar-icon inverted ${active ? 'active' : ''}`}
        style={style}
        onClick={handleClick}
      />
    </Tooltip>
  );
};

export default MapLayersCard;

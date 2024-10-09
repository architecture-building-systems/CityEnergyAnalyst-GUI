import { Tooltip } from 'antd';

import { useEffect, useState } from 'react';
import { useMapStore } from '../../../Map/store/store';
import axios from 'axios';
import { SolarRadiationIcon } from '../../../../assets/icons';

const useGetMapLayerCategories = () => {
  const [mapLayers, setMapLayers] = useState({});

  const fetchMapLayerCategories = async () => {
    try {
      const resp = await axios.get(
        `${import.meta.env.VITE_CEA_URL}/api/map_layers/`,
      );
      setMapLayers(resp.data);
    } catch (err) {
      console.error(err.response.data);
      // setError(err.response.data);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapLayerCategories();
  }, []);

  return mapLayers;
};

const MapLayers = () => {
  const [active, setActive] = useState(null);
  const setSelectedMapCategory = useMapStore(
    (state) => state.setSelectedMapCategory,
  );

  const mapLayers = useGetMapLayerCategories();

  const handleClick = (category) => {
    if (active == category) {
      setActive(null);
      setSelectedMapCategory(null);
    } else {
      setActive(category);
      const layers = mapLayers?.categories?.find((l) => l.name == category);
      setSelectedMapCategory(layers);
    }
  };

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
      {mapLayers?.categories?.map((category) => {
        const { name } = category;
        return (
          <CategoryIconButton
            key={name}
            onClick={handleClick}
            category={name}
            active={active == name}
          />
        );
      })}
    </div>
  );
};

const CategoryIconButton = ({ category, onClick, active }) => {
  // FIXME: This is hardcoded for now
  const _icon = SolarRadiationIcon;
  const style = active
    ? {
        color: 'white',
        backgroundColor: '#333',
      }
    : {
        color: 'black',
      };

  const handleClick = () => {
    onClick?.(category);
  };

  return (
    <Tooltip title={category} overlayInnerStyle={{ fontSize: 12 }}>
      <_icon
        className="cea-card-toolbar-icon"
        style={style}
        onClick={handleClick}
      />
    </Tooltip>
  );
};

export default MapLayers;

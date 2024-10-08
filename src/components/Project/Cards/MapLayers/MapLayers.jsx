import { Tooltip } from 'antd';

import { ToolOutlined } from '@ant-design/icons';
import { useState } from 'react';

const MapLayers = () => {
  const [active, setActive] = useState(null);

  const categories = [
    {
      category: 'Solar Radiation',
      icon: null,
    },
  ];

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
      {categories.map((item) => (
        <CategoryIconButton
          key={item.category}
          onClick={() => {
            setActive(active == item.category ? null : item.category);
          }}
          title={item.category}
          icon={item.icon}
          active={active == item.category}
        />
      ))}
    </div>
  );
};

const CategoryIconButton = ({ title, icon, onClick, active }) => {
  const _icon = icon ?? ToolOutlined;

  const style = active
    ? {
        color: 'white',
        backgroundColor: '#333',
      }
    : {
        color: 'black',
      };

  return (
    <Tooltip title={title} overlayInnerStyle={{ fontSize: 12 }}>
      <_icon
        className="cea-card-toolbar-icon"
        style={style}
        onClick={onClick}
      />
    </Tooltip>
  );
};

export default MapLayers;

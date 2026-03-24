import Gradient from 'javascript-color-gradient';
import { useMapStore } from 'features/map/stores/mapStore';
import { Select } from 'antd';
import { useEffect, useState } from 'react';
import { useMapLegends } from 'features/map/hooks/map-layers';
import { formatNumber } from 'features/map/utils';

const ColourRampLegend = ({ label, colours, points, range }) => {
  const keys = Object.keys(range ?? {});
  const [value, setValue] = useState(keys.length > 0 ? keys[0] : null);
  const _range = useMapStore((state) => state.range);
  const setRange = useMapStore((state) => state.setRange);

  const { min, max } = (range && value ? range[value] : null) ?? {
    min: 0,
    max: 0,
  };

  const options = Object.keys(range ?? {}).map((key) => ({
    label: range[key].label,
    value: key,
  }));

  const gradientArray = new Gradient()
    .setColorGradient(...colours)
    .setMidpoint(points)
    .getColors();

  useEffect(() => {
    if (!range || !value) return;
    const { min, max } = range[value];
    setRange([min, max]);
  }, [value, min, max, range, setRange]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <b>{label}</b>
      <div>Range</div>
      <Select
        value={value}
        onChange={setValue}
        defaultValue={0}
        options={options}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {gradientArray.map((color) => {
          const width = 24;
          return (
            <div
              style={{ backgroundColor: color, width: width, height: width }}
              key={color}
              title={color}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {_range ? formatNumber(Number(_range[0].toPrecision(3))) : ''}
        </div>
        <div>
          {_range ? formatNumber(Number(_range[1].toPrecision(3))) : ''}
        </div>
      </div>
    </div>
  );
};

const Legend = () => {
  const mapLayerLegends = useMapLegends();

  return (
    <div
      className="cea-overlay-card"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',

        display: 'flex',
        flexDirection: 'column',

        fontSize: 12,

        gap: 2,

        minWidth: 280,

        padding: 12,
        marginRight: 'auto',

        opacity: mapLayerLegends ? 1 : 0.8,
      }}
    >
      {mapLayerLegends &&
        Object.keys(mapLayerLegends).map((key) => {
          const value = mapLayerLegends[key];
          return (
            <ColourRampLegend
              key={key}
              label={value.label}
              colours={value.colourArray}
              points={value.points}
              range={value.range}
            />
          );
        })}
    </div>
  );
};

export default Legend;

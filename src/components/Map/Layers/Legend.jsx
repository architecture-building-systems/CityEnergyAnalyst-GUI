import Gradient from 'javascript-color-gradient';
import { useMapStore } from '../store/store';
import { Select } from 'antd';
import { useEffect, useState } from 'react';
import { useMapLegends } from '.';

const ColourRampLegend = ({ label, colours, points, range }) => {
  const [value, setValue] = useState(Object.keys(range)[0]);
  const _range = useMapStore((state) => state.range);
  const setRange = useMapStore((state) => state.setRange);

  const { min, max } = range?.[value] ?? { min: 0, max: 0 };

  const gradientArray = new Gradient()
    .setColorGradient(...colours)
    .setMidpoint(points)
    .getColors();

  useEffect(() => {
    const { min, max } = range[value];
    setRange([min, max]);
  }, [value, min, max]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div>
        <b>{label}</b>
      </div>
      <div>
        Range
        <Select
          value={value}
          onChange={setValue}
          defaultValue={0}
          style={{ margin: 12, width: 200 }}
        >
          {Object.keys(range).map((key) => {
            return (
              <Select.Option key={key} value={key}>
                {range[key].label}
              </Select.Option>
            );
          })}
        </Select>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {gradientArray.map((color) => {
          return (
            <div
              style={{ backgroundColor: color, width: 18, height: 18 }}
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
        <div>{Number(_range[0].toPrecision(3))}</div>
        <div>{Number(_range[1].toPrecision(3))}</div>
      </div>
    </div>
  );
};

export const Legend = () => {
  const selectedMapCategory = useMapStore((state) => state.selectedMapCategory);
  const mapLayerLegends = useMapLegends();

  if (!selectedMapCategory?.layers) return null;

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

        minWidth: 250,

        padding: 12,
        marginRight: 'auto',
      }}
    >
      {Object.keys(mapLayerLegends ?? {}).length === 0 ? (
        <b>No data fouund</b>
      ) : (
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
        })
      )}
    </div>
  );
};

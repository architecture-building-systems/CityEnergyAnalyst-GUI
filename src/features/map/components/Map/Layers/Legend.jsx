import Gradient from 'javascript-color-gradient';
import { useMapStore } from 'features/map/stores/mapStore';
import { Select } from 'antd';
import { useEffect, useState } from 'react';
import { useMapLegends } from 'features/map/hooks/map-layers';
import { formatNumber } from 'features/map/utils';
import InfoTooltip from 'components/InfoTooltip';

const ColourRampLegend = ({ label, colours, points, range }) => {
  const [selectedValue, setSelectedValue] = useState(null);
  const _range = useMapStore((state) => state.range);
  const setRange = useMapStore((state) => state.setRange);

  const keys = Object.keys(range ?? {});
  const value =
    selectedValue && keys.includes(selectedValue)
      ? selectedValue
      : (keys[0] ?? null);

  const { min, max } = (range && value ? range[value] : null) ?? {
    min: 0,
    max: 0,
  };

  const options = keys.map((key) => ({
    label: range[key].label,
    value: key,
  }));

  const gradientArray =
    colours?.length > 0
      ? new Gradient()
          .setColorGradient(...colours)
          .setMidpoint(points)
          .getColors()
      : null;

  useEffect(() => {
    if (!range || !value) return;
    const { min, max } = range[value];
    setRange([min, max]);
  }, [value, min, max, range, setRange]);

  if (!range || !value || !gradientArray) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <b>{label}</b>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Select
          style={{ flex: 1, minWidth: 0 }}
          value={value}
          onChange={setSelectedValue}
          defaultValue={0}
          options={options}
        />
        <InfoTooltip tooltipKey="map-layer-range-mode" placement="left" />
      </div>
      <div
        style={{
          display: 'flex',
          width: '100%',
        }}
      >
        {gradientArray.map((color) => (
          <div
            style={{
              backgroundColor: color,
              flex: 1,
              minWidth: 0,
              height: 24,
            }}
            key={color}
            title={color}
          />
        ))}
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

const CategoryLegend = ({ label, categories, range }) => {
  const setRange = useMapStore((state) => state.setRange);

  // Keep the HexagonLayer-style range state in sync (used by scale filter)
  // using the period/total max so the stacked columns render at an
  // appropriate elevation.
  useEffect(() => {
    if (!range) return;
    const keys = Object.keys(range);
    const first = keys[0];
    if (!first) return;
    const { min, max } = range[first] ?? {};
    setRange([min ?? 0, max ?? 0]);
  }, [range, setRange]);

  if (!categories?.length) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <b>{label}</b>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {categories.map((cat) => (
          <div
            key={cat.name}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: cat.colour,
                border: '1px solid rgba(0,0,0,0.15)',
              }}
            />
            <div>{cat.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Legend = ({ extras }) => {
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

        fontSize: 13,

        gap: 12,

        width: 280,
        flexShrink: 0,

        padding: 12,
        marginRight: 'auto',

        opacity: mapLayerLegends ? 1 : 0.8,
      }}
    >
      {mapLayerLegends &&
        Object.keys(mapLayerLegends).map((key) => {
          const value = mapLayerLegends[key];
          if (value?.stacked) {
            return (
              <CategoryLegend
                key={key}
                label={value.label}
                categories={value.categories}
                range={value.range}
              />
            );
          }
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
      {extras}
    </div>
  );
};

export default Legend;

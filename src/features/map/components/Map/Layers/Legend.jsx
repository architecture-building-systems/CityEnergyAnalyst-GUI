import Gradient from 'javascript-color-gradient';
import {
  useScopedFilters,
  useScopedRange,
  useScopedSetFilters,
  useScopedSetRange,
} from 'features/reports/components/mapInstance';
import { InputNumber, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useMapLegends } from 'features/map/hooks/map-layers';
import { formatNumber } from 'features/map/utils';
import InfoTooltip from 'components/InfoTooltip';

// `scale` and `radius` filters render inline in the Legend (next to
// the colour ramp) rather than in the parameters panel because they
// are visualization knobs, not data-fetch parameters.
export const LEGEND_FILTER_KEYS = ['scale', 'radius'];

const LegendFilterField = ({ label, filterKey, range, defaultValue }) => {
  const filters = useScopedFilters();
  const value = filters?.[filterKey];
  const setFilters = useScopedSetFilters();

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <b>{label}</b>
      <InputNumber
        min={range?.[0]}
        max={range?.[1]}
        value={value ?? defaultValue}
        onChange={(v) => setFilters(filterKey, v)}
        style={{ flex: 1, minWidth: 0 }}
      />
    </div>
  );
};

export const LegendFilterRow = ({ layers }) => {
  const fields = useMemo(() => {
    if (!layers?.length) return [];
    const layer = layers[0];
    if (!layer?.parameters) return [];

    const collected = [];
    for (const key of LEGEND_FILTER_KEYS) {
      for (const [, parameter] of Object.entries(layer.parameters)) {
        if (parameter?.filter === key) {
          collected.push({
            key,
            label: parameter.label ?? key,
            range: parameter.range,
            defaultValue: parameter.default,
          });
          break;
        }
      }
    }
    return collected;
  }, [layers]);

  if (!fields.length) return null;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {fields.map((f) => (
        <LegendFilterField
          key={f.key}
          label={f.label}
          filterKey={f.key}
          range={f.range}
          defaultValue={f.defaultValue}
        />
      ))}
    </div>
  );
};

const InfoRows = ({ info }) => {
  if (!info?.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {info.map((row) => (
        <div
          key={row.label}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <b>{row.label}</b>
          <span style={{ opacity: 0.8, textAlign: 'right' }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
};

const ColourRampLegend = ({ label, colours, points, range, info }) => {
  const [selectedValue, setSelectedValue] = useState(null);
  const _range = useScopedRange();
  const setRange = useScopedSetRange();

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
      <InfoRows info={info} />
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

const CategoryLegend = ({ label, categories, range, info }) => {
  const setRange = useScopedSetRange();

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
      <InfoRows info={info} />
      <b style={{ fontWeight: 500, opacity: 0.75 }}>surface</b>
      <div
        className="cea-legend-swatch-list"
        style={{
          // Show at most 5 rows; anything more becomes scrollable. Row
          // height = 16px swatch + 4px marginBottom = 20px per row, so 5
          // rows cap at 100px.
          display: 'block',
          height: categories.length > 5 ? 100 : 'auto',
          maxHeight: 100,
          overflowY: categories.length > 5 ? 'scroll' : 'visible',
          padding: 0,
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {categories.map((cat) => (
          <div
            key={cat.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: cat.colour,
                border: '1px solid rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: 12 }}>{cat.label ?? cat.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// `style` is merged on top of the defaults so callers can override
// width / chrome / spacing. Reports map cards stretch the legend
// full-width and drop the card chrome (shadow, background, padding)
// so it reads as part of the surrounding `FeatureCardShell`.
const Legend = ({ extras, style }) => {
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

        ...style,
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
                info={value.info}
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
              info={value.info}
            />
          );
        })}
      {extras}
    </div>
  );
};

export default Legend;

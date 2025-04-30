import { Slider } from 'antd';
import { formatNumber } from '../../utils';
import { useMemo, useState } from 'react';

const ceilToSignificantDigits = (num, digits) => {
  if (num === 0) return 0;
  if (!Number.isFinite(num)) return num; // Handle Infinity or NaN
  if (digits <= 0) return Math.ceil(num); // Handle non-positive digits

  const magnitude = Math.pow(
    10,
    digits - Math.floor(Math.log10(Math.abs(num))) - 1,
  );
  return Math.ceil(num * magnitude) / magnitude;
};

const ThresholdSelector = ({ label, value, defaultValue, range, onChange }) => {
  const [threshold, setThreshold] = useState(value ?? defaultValue);

  const marks = useMemo(() => {
    const markIndex = [200, 400, 600, 800, 1000];

    const _marks = {};
    markIndex.forEach((index) => {
      _marks[index] = {
        style: {
          color: '#0008',
        },
        label: formatNumber(index),
      };
    });
    return _marks;
  }, []);

  const handleChange = (value) => {
    setThreshold(value);
    onChange?.(value);
  };

  const roundedMin = useMemo(() => Number(range[0].toPrecision(3)), [range]);
  const roundedMax = useMemo(
    () => ceilToSignificantDigits(range[1], 3),
    [range],
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <b>{label ?? 'Threshold'}</b>
        <div>
          [{formatNumber(threshold[0])} - {formatNumber(threshold[1])}]
        </div>
      </div>
      <div style={{ paddingLeft: 12, paddingRight: 12 }}>
        <Slider
          value={threshold}
          min={roundedMin}
          max={roundedMax}
          defaultValue={defaultValue}
          range={{ draggableTrack: true }}
          onChange={handleChange}
          tooltip={{ placement: 'bottom' }}
          marks={marks}
        />
      </div>
    </div>
  );
};

export default ThresholdSelector;

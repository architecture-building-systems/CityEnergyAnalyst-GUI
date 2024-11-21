import { Slider } from 'antd';
import { useMapStore } from '../../store/store';
import { formatNumber } from '../../utils';
import { useEffect, useMemo, useState } from 'react';

const ThresholdSelector = ({ label, value, defaultValue, range }) => {
  const [threshold, setThreshold] = useState(value);

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

  const setFilter = useMapStore((state) => state.setFilter);

  const handleChange = (value) => {
    setThreshold(value);
    setFilter(value);
  };

  useEffect(() => {
    // If the threshold is not set on mount, set it to the default value
    if (threshold[0] === 0 && threshold[1] === 0 && defaultValue) {
      handleChange(defaultValue);
    }
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <b>{label ?? 'Threshold'}</b>
        <div>
          [{formatNumber(value[0])} - {formatNumber(value[1])}]
        </div>
      </div>
      <div style={{ paddingLeft: 12, paddingRight: 12 }}>
        <Slider
          value={threshold}
          min={Number(range[0].toPrecision(3))}
          max={Number(range[1].toPrecision(3))}
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

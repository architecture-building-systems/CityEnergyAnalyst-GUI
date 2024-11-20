import { Slider } from 'antd';
import { useMapStore } from '../../store/store';
import { formatNumber } from '../../utils';

const ThresholdSelector = ({ label, value, defaultValue, range }) => {
  const marks = {
    200: '200',
    400: '400',
    600: '600',
    800: '800',
    1000: formatNumber(1000),
  };

  const setFilter = useMapStore((state) => state.setFilter);

  const handleChange = (value) => {
    setFilter(value);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <b>{label ?? 'Threshold'}</b>
        <div>
          [{formatNumber(value[0])} - {formatNumber(value[1])}]
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <Slider
          min={Number(range[0].toPrecision(3))}
          max={Number(range[1].toPrecision(3))}
          defaultValue={value ?? defaultValue}
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

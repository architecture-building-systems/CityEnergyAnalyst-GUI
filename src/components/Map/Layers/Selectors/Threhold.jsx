import { Slider } from 'antd';
import { useMapStore } from '../../store/store';
import { formatNumber } from '../../utils';

const ThresholdSelector = ({ value, defaultValue, range }) => {
  const marks = {
    0: '0',
    200: '200',
    400: '400',
    600: '600',
    800: '800',
    1000: '1000',
  };

  const setFilter = useMapStore((state) => state.setFilter);

  const handleChange = (value) => {
    setFilter(value);
  };

  return (
    <div style={{ padding: 8, userSelect: 'none' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <b>Threshold</b>
        <i>
          [{formatNumber(value[0])} - {formatNumber(value[1])}]
        </i>
      </div>
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
  );
};

export default ThresholdSelector;

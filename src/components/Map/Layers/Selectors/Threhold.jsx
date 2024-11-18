import { Slider } from 'antd';
import { useMapStore } from '../../store/store';

const ThresholdSelector = ({ value, defaultValue, range }) => {
  const setFilter = useMapStore((state) => state.setFilter);

  const handleChange = (value) => {
    setFilter(value);
  };

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <b>Threshold</b>
        <i>
          [{value?.[0]} - {value?.[1]}]
        </i>
      </div>
      <Slider
        min={Number(range[0].toPrecision(3))}
        max={Number(range[1].toPrecision(3))}
        defaultValue={value ?? defaultValue}
        range={{ draggableTrack: true }}
        onChange={handleChange}
        tooltip={{ placement: 'bottom' }}
      />
    </div>
  );
};

export default ThresholdSelector;

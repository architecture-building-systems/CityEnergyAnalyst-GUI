import { Slider } from 'antd';
import { useMapStore } from '../../store/store';

const ThresholdSelector = ({ parameterName, defaultValue }) => {
  const setFilter = useMapStore((state) => state.setFilter);

  const mapLayers = useMapStore((state) => state.mapLayers);
  // FIXME: Remove hardcoded values
  const { min, max } = mapLayers?.['solar-irradiance']?.properties?.range
    ?.total ?? { min: 0, max: 1000 };

  const handleChange = (value) => {
    setFilter(value);
  };

  return (
    <div style={{ padding: 8 }}>
      <div>
        <b>Threshold</b>
      </div>
      <Slider
        min={Number(min.toPrecision(3))}
        max={Number(max.toPrecision(3))}
        defaultValue={defaultValue}
        range={{ draggableTrack: true }}
        onChangeComplete={handleChange}
        tooltip={{ open: true, placement: 'bottom' }}
      />
    </div>
  );
};

export default ThresholdSelector;

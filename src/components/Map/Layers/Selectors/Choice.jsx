import { Select } from 'antd';
import { useMapStore } from '../../store/store';

const ChoiceSelector = ({ parameterName, value, defaultValue, choices }) => {
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  const handleChange = (value) => {
    setMapLayerParameters((prev) => ({ ...prev, [parameterName]: value }));
  };

  const options = choices.map((choice) => ({
    value: choice,
    label: choice,
  }));

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div>
        <b>{parameterName}</b>
      </div>
      <Select
        onChange={handleChange}
        defaultValue={value ?? defaultValue}
        options={options}
        size="small"
      />
    </div>
  );
};

export default ChoiceSelector;

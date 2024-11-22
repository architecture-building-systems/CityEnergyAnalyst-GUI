import { Input, InputNumber } from 'antd';
import { useMapStore } from '../../store/store';

const InputSelector = ({ parameterName, value, defaultValue, type }) => {
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  const handleChange = (value) => {
    setMapLayerParameters((prev) => ({ ...prev, [parameterName]: value }));
  };

  const Component = type == 'number' ? InputNumber : Input;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div>
        <b>{parameterName}</b>
      </div>
      <Component onChange={handleChange} defaultValue={value ?? defaultValue} />
    </div>
  );
};

export default InputSelector;

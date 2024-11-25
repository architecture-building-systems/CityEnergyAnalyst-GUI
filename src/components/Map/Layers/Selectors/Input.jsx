import { Input, InputNumber } from 'antd';

const InputSelector = ({
  parameterName,
  value,
  defaultValue,
  onChange,
  type,
}) => {
  const handleChange = (value) => {
    onChange?.(value);
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

import { Input, InputNumber } from 'antd';

export const InputSelector = ({
  parameterName,
  label,
  value,
  defaultValue,
  onChange,
}) => {
  const handleChange = (value) => {
    onChange?.(value);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div>
        <b>{label}</b>
      </div>
      <Input onChange={handleChange} defaultValue={value ?? defaultValue} />
    </div>
  );
};

export const InputNumberSelector = ({
  parameterName,
  label,
  value,
  defaultValue,
  onChange,
  range,
}) => {
  const handleChange = (value) => {
    onChange?.(value);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div>
        <b>{label}</b>
      </div>
      <InputNumber
        min={range?.[0]}
        max={range?.[1]}
        onChange={handleChange}
        defaultValue={value ?? defaultValue}
      />
    </div>
  );
};

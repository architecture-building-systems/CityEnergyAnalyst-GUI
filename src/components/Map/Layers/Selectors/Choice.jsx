import { Select } from 'antd';

const ChoiceSelector = ({
  parameterName,
  value,
  defaultValue,
  choices,
  onChange,
}) => {
  const handleChange = (value) => {
    onChange?.(value);
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
        placement="topLeft"
      />
    </div>
  );
};

export default ChoiceSelector;

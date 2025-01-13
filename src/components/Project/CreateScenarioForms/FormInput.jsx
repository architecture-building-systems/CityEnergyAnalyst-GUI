import { Divider, Select } from 'antd';
import { OpenDialogButton, OpenDialogInput } from '../../Tools/Parameter';

export const FileDialog = ({
  name,
  type,
  filters,
  placeholder,
  onChange,
  value,
}) => {
  return (
    <OpenDialogInput
      name={name}
      type={type}
      filters={filters}
      onChange={onChange}
      value={value}
      placeholder={placeholder}
    />
  );
};

export const SelectWithFileDialog = ({
  name,
  type,
  filters,
  placeholder,
  onChange,
  options,
  children,
  value,
}) => {
  const _value = value instanceof File ? value.name : value;

  return (
    <Select
      value={_value}
      placeholder={placeholder}
      onSelect={onChange}
      dropdownRender={(menu) => (
        <div>
          {menu}
          <Divider style={{ margin: '4px 0' }} />
          <OpenDialogButton
            name={name}
            type={type}
            filters={filters}
            onChange={onChange}
          >
            {children}
          </OpenDialogButton>
        </div>
      )}
      options={options}
    />
  );
};

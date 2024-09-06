import { Divider, Select } from 'antd';
import { OpenDialogButton } from '../../Tools/Parameter';

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
  return (
    <Select
      value={value}
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

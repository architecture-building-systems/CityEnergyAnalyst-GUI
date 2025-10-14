import {
  CloseOutlined,
  FileImageOutlined,
  FileSearchOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Input,
  Switch,
  Select,
  Divider,
  Button,
  Space,
  Upload,
  Form,
} from 'antd';
import { checkExist } from 'utils/file';
import { forwardRef, useState } from 'react';

import { isElectron, openDialog } from 'utils/electron';
import { SelectWithFileDialog } from 'features/scenario/components/CreateScenarioForms/FormInput';

const Parameter = ({ parameter, form }) => {
  const { name, type, value, choices, nullable, help } = parameter;
  const { setFieldsValue } = form;

  switch (type) {
    case 'IntegerParameter':
    case 'RealParameter': {
      const stringValue = value !== null ? value.toString() : '';
      const regex =
        type === 'IntegerParameter'
          ? /^([1-9][0-9]*|0)$/
          : /^([1-9][0-9]*|0)(\.\d+)?$/;
      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={stringValue}
          help={help}
          rules={[
            {
              type: 'number',
              message: `Please enter an ${
                type === 'IntegerParameter' ? 'integer' : 'float'
              }`,
              transform: (num) => {
                if (num === '') return 0;
                return regex.test(num) ? Number(num) : NaN;
              },
            },
          ]}
          inputComponent={
            <Input placeholder={nullable ? 'Leave blank for default' : null} />
          }
        />
      );
    }
    case 'PathParameter':
    case 'FileParameter': {
      const contentType = type == 'PathParameter' ? 'directory' : 'file';
      const filters =
        type == 'PathParameter'
          ? []
          : [
              {
                name,
                extensions: parameter?.extensions || [],
              },
            ];

      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          rules={[
            {
              validator: async (rule, value) => {
                if (value == '' && nullable) return Promise.resolve();

                try {
                  await checkExist(value, contentType);
                  return Promise.resolve();
                } catch (error) {
                  return Promise.reject(`${value} is not a valid path`);
                }
              },
            },
          ]}
          inputComponent={
            <OpenDialogInput form={form} type={contentType} filters={filters} />
          }
        />
      );
    }
    case 'InputFileParameter': {
      const filters = [
        {
          name,
          extensions: parameter?.extensions || [],
        },
      ];
      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          inputComponent={
            <OpenDialogInput form={form} type="file" filters={filters} />
          }
        />
      );
    }
    case 'ChoiceParameter':
    case 'PlantNodeParameter':
    case 'ScenarioNameParameter':
    case 'SingleBuildingParameter':
    case 'GenerationParameter':
    case 'SystemParameter':
    case 'ColumnChoiceParameter': {
      const options = choices.map((choice) => ({
        label: choice,
        value: choice,
      }));

      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          rules={[
            {
              validator: (rule, value) => {
                if (choices.length < 1) {
                  if (type === 'GenerationParameter')
                    return Promise.reject(
                      'No generations found. Run optimization first.',
                    );
                  else
                    return Promise.reject(
                      'There are no valid choices for this input',
                    );
                } else if (value == null) {
                  return Promise.reject('Select a choice');
                } else if (!choices.includes(value)) {
                  return Promise.reject(`${value} is not a valid choice`);
                } else {
                  return Promise.resolve();
                }
              },
            },
          ]}
          inputComponent={
            <Select options={options} disabled={!choices.length} />
          }
        />
      );
    }
    case 'MultiChoiceParameter':
    case 'BuildingsParameter':
    case 'MultiSystemParameter':
    case 'ColumnMultiChoiceParameter':
    case 'ScenarioNameMultiChoiceParameter': {
      const options = choices.map((choice) => ({
        label: choice,
        value: choice,
      }));

      const placeholder =
        type == 'BuildingsParameter' ? 'All Buildings' : 'Nothing Selected';
      const selectAll = (e) => {
        e.preventDefault();
        setFieldsValue({
          [name]: choices,
        });
      };

      const unselectAll = (e) => {
        e.preventDefault();
        setFieldsValue({
          [name]: [],
        });
      };

      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          rules={[
            {
              validator: (rule, value) => {
                const invalidChoices = value.filter(
                  (choice) => !choices.includes(choice),
                );
                if (invalidChoices.length) {
                  return Promise.reject(
                    `${invalidChoices.join(', ')} ${
                      invalidChoices.length > 1
                        ? 'are not valid choices'
                        : 'is not a valid choice'
                    }`,
                  );
                } else {
                  return Promise.resolve();
                }
              },
            },
          ]}
          inputComponent={
            <Select
              options={options}
              mode="multiple"
              style={{ width: '100%' }}
              placeholder={placeholder}
              maxTagCount={10}
              popupRender={(menu) => (
                <div>
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <Button onMouseDown={selectAll} style={{ width: '45%' }}>
                      Select All
                    </Button>
                    <Button onMouseDown={unselectAll} style={{ width: '45%' }}>
                      Unselect All
                    </Button>
                  </div>
                  <Divider style={{ margin: '4px 0' }} />
                  {menu}
                </div>
              )}
            />
          }
        />
      );
    }
    case 'DatabasePathParameter': {
      const { choices } = parameter;
      const { Option } = Select;
      const Options = Object.keys(choices).map((choice) => (
        <Option key={choice} value={choices[choice]}>
          {choice}
        </Option>
      ));
      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          inputComponent={
            <Select
              popupRender={(menu) => (
                <div>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <OpenDialogButton
                    form={form}
                    type="directory"
                    id={name}
                    onChange={(value) => setFieldsValue({ [name]: value })}
                  >
                    <PlusOutlined />
                    Browse for databases path
                  </OpenDialogButton>
                </div>
              )}
            >
              {Options}
            </Select>
          }
        />
      );
    }

    case 'WeatherPathParameter': {
      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          inputComponent={
            <SelectWithFileDialog
              placeholder="Choose an option from the dropdown"
              name="weather"
              type="file"
              filters={[{ name: 'Weather files', extensions: ['epw'] }]}
              options={[
                {
                  label: 'Fetch from climate.onebuilding.org',
                  value: 'climate.onebuilding.org',
                },
                {
                  label: 'Generate a future weather file using pyepwmorph',
                  value: 'pyepwmorph',
                },
              ]}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'left' }}>
                <FileSearchOutlined />
                Import .epw file
              </div>
            </SelectWithFileDialog>
          }
        />
      );
    }
    case 'BooleanParameter':
      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          config={{
            valuePropName: 'checked',
          }}
          inputComponent={<Switch />}
        />
      );

    // Plot Context is not editable for now
    case 'PlotContextParameter': {
      const config = {
        getValueProps: (value) => ({
          value: value
            ? Object.keys(value)
                .map((key) => `${key}: ${value[key]}`)
                .join(', ')
            : '',
        }),
      };

      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          inputComponent={<Input disabled />}
          config={config}
        />
      );
    }

    default:
      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
        />
      );
  }
};

export const FormItemWrapper = ({
  name,
  help,
  initialValue = null,
  required = false,
  rules = [],
  config = {},
  inputComponent = <Input />,
}) => {
  return (
    <Form.Item
      label={<b>{name}</b>}
      wrapperCol={{ offset: 1, span: 22 }}
      key={name}
      name={name}
      extra={<div style={{ fontSize: 12 }}>{help}</div>}
      rules={[{ required: required }, ...rules]}
      initialValue={initialValue}
      {...config}
    >
      {inputComponent}
    </Form.Item>
  );
};

const PathInput = ({ value, onChange, form, name, ...rest }) => {
  const [inputValue, setValue] = useState(value);

  const onClick = () => {
    form?.setFieldsValue({ [name]: inputValue });
  };

  const onValueChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);

    onChange?.(newValue);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          {...rest}
          value={value || inputValue}
          onChange={onValueChange}
          type="text"
        />
        <Button type="primary" onClick={onClick}>
          Select
        </Button>
      </Space.Compact>
    </Space>
  );
};

const UploadInput = (props) => {
  const { children, onChange, ...rest } = props;

  const handlePreview = async (file) => {
    console.log(file);
  };

  // TODO: Add support for multiple files
  return (
    <Upload
      showUploadList={false}
      onPreview={handlePreview}
      beforeUpload={(file) => {
        onChange(file);
        return false; // Prevent automatic upload
      }}
      {...rest}
    >
      <Button block>{children}</Button>
    </Upload>
  );
};

const covertFiltersToExtensions = (filters) => {
  return filters
    .map((filter) => (filter.extensions ? `.${filter.extensions}` : ''))
    .join(',');
};

export const OpenDialogInput = forwardRef((props, ref) => {
  const {
    form,
    name,
    type,
    onChange,
    filters = [],
    children,
    value,
    ...rest
  } = props;

  const _value = value instanceof File ? value.name : value;
  const extensions = covertFiltersToExtensions(filters);

  if (isElectron())
    return (
      <Space.Compact block style={{ paddingBottom: 3 }}>
        <Input
          ref={ref}
          style={{ width: '100%' }}
          value={_value}
          {...rest}
          readOnly
        />
        <Button
          type="primary"
          style={{ width: 60 }}
          icon={<FileSearchOutlined />}
          onClick={async () => {
            // TODO: Remove need for form
            const path = await openDialog(form, type, filters, name);
            onChange?.(path);
            form?.validateFields([name]);
          }}
        />
      </Space.Compact>
    );

  return !value ? (
    <UploadInput
      form={form}
      name={name}
      onChange={onChange}
      type={type}
      accept={extensions}
      {...rest}
    >
      {children || <UploadOutlined />}
    </UploadInput>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <FileImageOutlined />
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {_value}
      </div>
      <Button
        icon={<CloseOutlined />}
        onClick={() => onChange({ target: { value: '' } })}
        danger
      />
    </div>
  );
});
OpenDialogInput.displayName = 'OpenDialogInput';

export const OpenDialogButton = ({
  form,
  name,
  type,
  filters = [],
  children,
  buttonType = 'default',
  onChange,
  ...rest
}) => {
  if (!isElectron()) {
    const extensions = covertFiltersToExtensions(filters);

    return (
      <UploadInput
        form={form}
        name={name}
        onChange={onChange}
        type={type}
        accept={extensions}
        {...rest}
      >
        {children}
      </UploadInput>
    );
  } else {
    return (
      <Button
        type={buttonType}
        style={{ width: '100%' }}
        onClick={async () => {
          // TODO: Remove need for form
          const path = await openDialog(form, type, filters, name);
          onChange?.(path);
          form?.validateFields([name]);
        }}
      >
        {children}
      </Button>
    );
  }
};

export default Parameter;

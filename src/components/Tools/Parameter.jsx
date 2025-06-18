import {
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
import { basename, checkExist, dirname } from '../../utils/file';
import { forwardRef, useState } from 'react';

import { isElectron, openDialog } from '../../utils/electron';

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
              validator: async (rule, value, callback) => {
                if (value == '' && nullable) return callback();

                const pathExists =
                  contentType == 'directory'
                    ? await checkExist('', contentType, value)
                    : await checkExist(
                        basename(value),
                        contentType,
                        dirname(value),
                      );
                if (!pathExists) {
                  callback('Path entered is invalid');
                } else {
                  callback();
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
    case 'ChoiceParameter':
    case 'PlantNodeParameter':
    case 'ScenarioNameParameter':
    case 'SingleBuildingParameter':
    case 'GenerationParameter':
    case 'SystemParameter':
    case 'ColumnChoiceParameter':
      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          rules={[
            {
              validator: (rule, value, callback) => {
                if (choices.length < 1) {
                  if (type === 'GenerationParameter')
                    callback('No generations found. Run optimization first.');
                  else callback('There are no valid choices for this input');
                } else if (value == null) {
                  callback('Select a choice');
                } else if (!choices.includes(value)) {
                  callback(`${value} is not a valid choice`);
                } else {
                  callback();
                }
              },
            },
          ]}
          inputComponent={
            <Select disabled={!choices.length}>
              {choices.map((choice) => (
                <Select.Option key={choice} value={choice}>
                  {choice}
                </Select.Option>
              ))}
            </Select>
          }
        />
      );
    case 'MultiChoiceParameter':
    case 'BuildingsParameter':
    case 'MultiSystemParameter':
    case 'ColumnMultiChoiceParameter':
    case 'ScenarioNameMultiChoiceParameter': {
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
              validator: (rule, value, callback) => {
                const invalidChoices = value.filter(
                  (choice) => !choices.includes(choice),
                );
                if (invalidChoices.length) {
                  callback(
                    `${invalidChoices.join(', ')} ${
                      invalidChoices.length > 1
                        ? 'are not valid choices'
                        : 'is not a valid choice'
                    }`,
                  );
                } else {
                  callback();
                }
              },
            },
          ]}
          inputComponent={
            <Select
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
            >
              {choices.map((choice) => (
                <Select.Option key={choice} value={choice}>
                  {choice}
                </Select.Option>
              ))}
            </Select>
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
      const { choices } = parameter;
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
                    type="file"
                    filters={[{ name: 'Weather files', extensions: ['epw'] }]}
                    id={name}
                    onChange={(value) => setFieldsValue({ [name]: value })}
                  >
                    <PlusOutlined />
                    Browse for weather file
                  </OpenDialogButton>
                </div>
              )}
              options={[
                {
                  label: <span>Third-party sources</span>,
                  title: 'Third-party sources',
                  options: [
                    {
                      label: <span> Fetch from climate.onebuilding.org</span>,
                      value: 'climate.onebuilding.org',
                    },
                  ],
                },
                {
                  label: <span>CEA Built-in</span>,
                  title: 'CEA Built-in',
                  options: Object.keys(choices).map((choice) => {
                    return {
                      label: <span>{choice}</span>,
                      value: choices[choice],
                    };
                  }),
                },
              ]}
            />
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

  const input = isElectron() ? (
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
  ) : (
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
  );

  return (
    <Space.Compact block style={{ paddingBottom: 3 }}>
      <Input
        ref={ref}
        style={{ width: '100%' }}
        onChange={onChange}
        value={_value}
        {...rest}
      />
      {input}
    </Space.Compact>
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

import { Form } from '@ant-design/compatible';
import { FileSearchOutlined, PlusOutlined } from '@ant-design/icons';
import { Input, Switch, Select, Divider, Button, Space } from 'antd';
import { basename, checkExist, dirname } from '../../utils/file';
import { forwardRef } from 'react';

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
          inputComponent={<Input />}
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
    case 'MultiSystemParameter': {
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
              placeholder="Nothing Selected"
              maxTagCount={10}
              dropdownRender={(menu) => (
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
              dropdownRender={(menu) => (
                <div>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <OpenDialogButton form={form} type="directory" id={name}>
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
              dropdownRender={(menu) => (
                <div>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <OpenDialogButton
                    form={form}
                    type="file"
                    filters={[{ name: 'Weather files', extensions: ['epw'] }]}
                    id={name}
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
                      value: '',
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
  form,
  name,
  initialValue,
  help,
  required = false,
  rules = [],
  config = {},
  inputComponent = <Input />,
}) => {
  return (
    <Form.Item
      label={name}
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 15, offset: 1 }}
      key={name}
    >
      {form.getFieldDecorator(name, {
        ...(typeof initialValue === 'undefined' ? {} : { initialValue }),
        rules: [{ required: required }, ...rules],
        ...config,
      })(inputComponent)}
      <small style={{ display: 'block', lineHeight: 'normal' }}>{help}</small>
    </Form.Item>
  );
};

export const OpenDialogInput = forwardRef((props, ref) => {
  const { form, type, filters = [], id, ...rest } = props;

  if (!isElectron()) return <Input ref={ref} {...props} />;

  return (
    <Space.Compact block style={{ paddingBottom: 3 }}>
      <Input ref={ref} style={{ width: '100%' }} {...rest} />
      <Button
        type="primary"
        style={{ width: 60 }}
        icon={<FileSearchOutlined />}
        onClick={async () => {
          await openDialog(form, type, filters, id);
        }}
      ></Button>
    </Space.Compact>
  );
});
OpenDialogInput.displayName = 'OpenDialogInput';

export const OpenDialogButton = (props) => {
  const { form, type, filters = [], id, children } = props;

  // ignore if not electron for now
  if (!isElectron()) return null;

  return (
    <Button
      style={{ width: '100%' }}
      onClick={async () => {
        await openDialog(form, type, filters, id);
      }}
    >
      {children}
    </Button>
  );
};

export default Parameter;

import { forwardRef } from 'react';
import { ipcRenderer } from 'electron';
import fs from 'fs';
import { EllipsisOutlined, PlusOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Switch, Select, Divider, Button } from 'antd';

const Parameter = ({ parameter, form }) => {
  const { name, type, value, choices, help } = parameter;
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
      return (
        <FormItemWrapper
          form={form}
          name={name}
          initialValue={value}
          help={help}
          rules={[
            {
              validator: (rule, value, callback) => {
                if (!fs.existsSync(value)) {
                  callback('Path does not exist');
                } else {
                  callback();
                }
              },
            },
          ]}
          inputComponent={<OpenDialogInput form={form} type={type} />}
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
    case 'OrderedMultiChoiceParameter':
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
                  (choice) => !choices.includes(choice)
                );
                if (invalidChoices.length) {
                  callback(
                    `${invalidChoices.join(', ')} ${
                      invalidChoices.length > 1
                        ? 'are not valid choices'
                        : 'is not a valid choice'
                    }`
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
              showArrow
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
                  <div
                    style={{ padding: '8px', cursor: 'pointer' }}
                    onMouseDown={() => openDialog(form, 'PathParameter', name)}
                    role="button"
                    tabIndex={0}
                  >
                    <PlusOutlined /> Browse for databases path
                  </div>
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
                  <div
                    style={{ padding: '8px', cursor: 'pointer' }}
                    onMouseDown={() => openDialog(form, type, name)}
                    role="button"
                    tabIndex={0}
                  >
                    <PlusOutlined /> Browse for weather file
                  </div>
                </div>
              )}
            >
              {Options}
            </Select>
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
      wrapperCol={{ span: 11, offset: 1 }}
      key={name}
    >
      {form.getFieldDecorator(name, {
        ...(typeof initialValue === 'undefined' ? {} : { initialValue }),
        rules: [{ required: required }, ...rules],
        ...config,
      })(inputComponent)}
      <br />
      <small style={{ display: 'block', lineHeight: 'normal' }}>{help}</small>
    </Form.Item>
  );
};

export const OpenDialogInput = forwardRef((props, ref) => {
  const { form, type, id, ...rest } = props;
  return (
    <Input
      ref={ref}
      addonAfter={
        <button
          className={type}
          type="button"
          style={{ height: '30px', width: '50px' }}
          onClick={() => openDialog(form, type, id)}
        >
          <EllipsisOutlined />
        </button>
      }
      {...rest}
    />
  );
});

const openDialog = async (form, type, name) => {
  const options =
    type === 'PathParameter'
      ? { properties: ['openDirectory'] }
      : { properties: ['openFile'] };

  const paths = await ipcRenderer.invoke('open-dialog', options);
  if (paths && paths.length) {
    form.setFieldsValue({ [name]: paths[0] });
  }
};

export default Parameter;

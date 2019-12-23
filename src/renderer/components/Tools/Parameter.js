import React from 'react';
import { remote } from 'electron';
import fs from 'fs';
import { Form, Input, Icon, Switch, Select, Divider, Button } from 'antd';

const parameter = (param, form, config = {}) => {
  const { name, type, value, choices, help } = param;
  const { setFieldsValue } = form;
  const openDialog = () => {
    const options =
      type === 'PathParameter'
        ? { properties: ['openDirectory'] }
        : { properties: ['openFile'] };
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), options, paths => {
      if (paths && paths.length) {
        form.setFieldsValue({ [name]: paths[0] });
      }
    });
  };

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
          value={stringValue}
          help={help}
          config={{
            rules: [
              {
                type: 'number',
                message: `Please enter an ${
                  type === 'IntegerParameter' ? 'integer' : 'float'
                }`,
                transform: num => {
                  if (num === '') return 0;
                  return regex.test(num) ? Number(num) : NaN;
                }
              }
            ],
            ...config
          }}
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
          value={value}
          help={help}
          config={{
            rules: [
              {
                validator: (rule, value, callback) => {
                  if (!fs.existsSync(value)) {
                    callback('Path does not exist');
                  } else {
                    callback();
                  }
                }
              }
            ],
            ...config
          }}
          inputComponent={
            <Input
              addonAfter={
                <button
                  className={type}
                  type="button"
                  style={{ height: '30px', width: '50px' }}
                  onClick={openDialog}
                >
                  <Icon type="ellipsis" />
                </button>
              }
            />
          }
        />
      );
    }
    case 'ChoiceParameter':
    case 'PlantNodeParameter':
    case 'RegionParameter':
    case 'ScenarioNameParameter':
    case 'SingleBuildingParameter':
      return (
        <FormItemWrapper
          form={form}
          name={name}
          value={value}
          help={help}
          config={config}
          inputComponent={
            <Select>
              {choices.map(choice => (
                <Select.Option key={choice} value={choice}>
                  {choice}
                </Select.Option>
              ))}
            </Select>
          }
        />
      );
    case 'MultiChoiceParameter':
    case 'BuildingsParameter': {
      const selectAll = e => {
        e.preventDefault();
        setFieldsValue({
          [name]: choices
        });
      };

      const unselectAll = e => {
        e.preventDefault();
        setFieldsValue({
          [name]: []
        });
      };

      return (
        <FormItemWrapper
          form={form}
          name={name}
          value={value}
          help={help}
          config={config}
          inputComponent={
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Nothing Selected"
              showArrow
              maxTagCount={10}
              dropdownRender={menu => (
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
              {choices.map(choice => (
                <Select.Option key={choice} value={choice}>
                  {choice}
                </Select.Option>
              ))}
            </Select>
          }
        />
      );
    }
    case 'WeatherPathParameter': {
      const { choices } = param;
      const { Option } = Select;
      const Options = Object.keys(choices).map(choice => (
        <Option key={choice} value={choices[choice]}>
          {choice}
        </Option>
      ));
      return (
        <FormItemWrapper
          form={form}
          name={name}
          value={value}
          help={help}
          config={config}
          inputComponent={
            <Select
              dropdownRender={menu => (
                <div>
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <div
                    style={{ padding: '8px', cursor: 'pointer' }}
                    onMouseDown={openDialog}
                    role="button"
                    tabIndex={0}
                  >
                    <Icon type="plus" /> Browse for weather file
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
          value={value}
          help={help}
          config={{
            valuePropName: 'checked',
            ...config
          }}
          inputComponent={<Switch />}
        />
      );
    default:
      return (
        <FormItemWrapper
          form={form}
          name={name}
          value={value}
          help={help}
          config={config}
          inputComponent={<Input />}
        />
      );
  }
};

const FormItemWrapper = ({
  form,
  name,
  value,
  help,
  config,
  inputComponent
}) => {
  return (
    <Form.Item
      label={name}
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 11, offset: 1 }}
      key={name}
    >
      {form.getFieldDecorator(name, {
        initialValue: value,
        ...config
      })(inputComponent)}
      <br />
      <small style={{ display: 'block', lineHeight: 'normal' }}>{help}</small>
    </Form.Item>
  );
};

export default parameter;

import { Form } from '@ant-design/compatible';
import { PlusOutlined } from '@ant-design/icons';
import { Input, Switch, Select, Divider, Button } from 'antd';
import { checkExist } from '../../utils/file';

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
              validator: async (rule, value, callback) => {
                const contentType =
                  type == 'PathParameter' ? 'directory' : 'file';
                const pathExists = await checkExist('', contentType, value);
                if (!pathExists) {
                  callback('Path does not exist');
                } else {
                  callback();
                }
              },
            },
          ]}
          inputComponent={<Input form={form} type={type} />}
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

// export const OpenDialogInput = forwardRef((props, ref) => {
//   const { form, type, id, ...rest } = props;
//   const [open, setOpen] = useState(false);
//   const onSuccess = (contentPath) => {
//     form.setFieldsValue({ [id]: contentPath });
//   };
//   return (
//     <>
//       <Space.Compact block style={{ paddingBottom: 3 }}>
//         <Input ref={ref} style={{ width: '100%' }} {...rest} />
//         <Button
//           type="primary"
//           style={{ width: 60 }}
//           icon={<SearchOutlined />}
//           onClick={() => {
//             setOpen(true);
//           }}
//         ></Button>
//       </Space.Compact>
//       <DialogModel open={open} setOpen={setOpen} onSuccess={onSuccess} />
//     </>
//   );
// });
// OpenDialogInput.displayName = 'OpenDialogInput';

export default Parameter;

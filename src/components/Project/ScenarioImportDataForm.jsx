import { DownOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import { Input, Button, Dropdown, Menu } from 'antd';

const ScenarioImportDataForm = ({ form, visible }) => {
  const inputFiles = {
    zone: {
      extension: ['.shp'],
      placeholder: 'Path to geometry of the zone',
      help: '',
    },
    surroundings: {
      extension: ['.shp'],
      placeholder: 'Path to geometry of surroundings',
      help: '',
    },
    streets: {
      extension: ['.shp'],
      placeholder: 'Path to street geometry',
      help: '',
    },
    terrain: {
      extension: ['.tif'],
      placeholder: 'Path to the digital elevation model',
      help: '',
    },
    typology: {
      extension: ['.dbf'],
      placeholder: 'Path to typology database',
      help: 'Leave empty for CEA to create one for you',
    },
  };
  form.getFieldDecorator('fields', {
    initialValue: ['zone', 'typology'],
  });
  const fields = form.getFieldValue('fields');
  const fileChoices = Object.keys(inputFiles).filter(
    (fileType) => !fields.includes(fileType),
  );

  const addField = (value) => {
    const newFields = fields.concat(value);
    form.setFieldsValue({
      fields: newFields,
    });
  };

  const removeField = (k) => {
    form.setFieldsValue({
      fields: fields.filter((key) => key !== k),
    });
  };

  // TODO: Check if file is valid
  const vaildFile = () => {
    return true;
  };

  const items = fileChoices.map((choice) => ({
    key: choice,
    label: choice,
  }));

  const onClick = ({ key }) => {
    addField(key);
  };

  return (
    <div
      style={{
        display: visible ? 'block' : 'none',
      }}
    >
      <Dropdown menu={{ items, onClick }} trigger={['click']}>
        <Button>
          Select additional files that you want to import <DownOutlined />
        </Button>
      </Dropdown>

      {fields.map((key) => (
        <Form.Item key={key} label={key}>
          {form.getFieldDecorator(`files[${key}]`, {
            initialValue: '',
            rules: [
              { required: visible && key === 'zone' },
              visible
                ? {
                    validator: (rule, value, callback) => {
                      if (!vaildFile(key, value))
                        callback(`Select a vaild ${key} file`);
                      else callback();
                    },
                  }
                : {},
            ],
          })(
            <Input
              style={{ width: '60%', marginRight: 8 }}
              placeholder={inputFiles[key].placeholder}
            />,
          )}
          {['zone', 'typology'].includes(key) ? null : (
            <MinusCircleOutlined
              onClick={() => removeField(key)}
              style={{
                position: 'relative',
                top: 4,
                color: '#ff4d4f',
                fontSize: 24,
              }}
            />
          )}
          <small style={{ display: 'block', lineHeight: 'normal' }}>
            {inputFiles[key].help}
          </small>
        </Form.Item>
      ))}
    </div>
  );
};

export default ScenarioImportDataForm;

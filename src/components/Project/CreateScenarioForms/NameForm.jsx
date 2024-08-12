import { Form, Input, Button } from 'antd';
import { useState } from 'react';

const NameForm = ({ initialValues, onFinish }) => {
  const [value, setValue] = useState(initialValues.name);

  const onNameChange = (e) => {
    const { value } = e.target;
    setValue(value);

    if (value.indexOf(' ') !== -1) {
      console.log(e.target.value);
    }
  };

  return (
    <Form initialValues={initialValues} onFinish={onFinish} layout="vertical">
      <Form.Item
        label="Scenario Name"
        name="scenario_name"
        extra="Name must be unique and contain no spaces"
        rules={[{ required: true, message: 'Scenario name cannot be empty' }]}
      >
        <Input
          placeholder="new_scenario"
          onChange={onNameChange}
          autoComplete="off"
        />
      </Form.Item>
      {value !== undefined && value.trim().indexOf(' ') !== -1 && (
        <span>
          Name will be saved as "
          <span style={{ fontFamily: 'monospace' }}>
            {value.replace(/\s/g, '_')}
          </span>
        </span>
      )}

      <Form.Item>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            style={{ padding: '0 36px' }}
          >
            Next
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

export default NameForm;

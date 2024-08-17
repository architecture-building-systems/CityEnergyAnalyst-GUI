import { Form, Input, Button } from 'antd';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const NameForm = ({ initialValues, onFinish, onMount }) => {
  const { info } = useSelector((state) => state.project);
  const scenarioNames = info?.scenarios_list || [];
  const [value, setValue] = useState(initialValues.name);

  const onNameChange = (e) => {
    const { value } = e.target;
    setValue(value);

    if (value.indexOf(' ') !== -1) {
      console.log(e.target.value);
    }
  };

  useEffect(() => {
    onMount?.();
  }, []);

  const validateScenarioName = (_, value) => {
    if (scenarioNames.includes(value)) {
      return Promise.reject('Scenario name already exists.');
    }
    return Promise.resolve();
  };

  return (
    <Form initialValues={initialValues} onFinish={onFinish} layout="vertical">
      <Form.Item
        label="Scenario Name"
        name="scenario_name"
        extra="Name must be unique and contain no spaces."
        rules={[
          { required: true, message: 'Scenario name cannot be empty.' },
          { validator: validateScenarioName },
        ]}
      >
        <Input
          placeholder="Example: new_scenario_name"
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
          ".
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

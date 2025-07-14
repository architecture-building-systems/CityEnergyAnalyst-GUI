import { Form, Input } from 'antd';
import { useState } from 'react';
import { useProjectStore } from 'features/project/stores/projectStore';
import { getValidateScenarioNameFunc } from 'utils/project';

const NameForm = ({ initialValues, onFinish, formButtons }) => {
  const scenariosList = useProjectStore((state) => state.scenariosList);
  const scenarioNames = scenariosList || [];
  const validateScenarioName = getValidateScenarioNameFunc(scenarioNames);

  const [value, setValue] = useState(initialValues.name);

  const onNameChange = (e) => {
    const { value } = e.target;
    setValue(value);

    if (value.indexOf(' ') !== -1) {
      console.log(e.target.value);
    }
  };

  const onFormFinish = (value) => {
    // Remove whitespace from name
    const scenario_name = value.scenario_name.replace(/\s/g, '_');
    onFinish?.({ scenario_name });
  };

  return (
    <Form
      initialValues={initialValues}
      onFinish={onFormFinish}
      layout="vertical"
    >
      {formButtons}
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
    </Form>
  );
};

export default NameForm;

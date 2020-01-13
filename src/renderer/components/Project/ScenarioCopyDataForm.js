import React from 'react';
import { Form, Select } from 'antd';

const ScenarioCopyDataForm = ({ form, visible, project }) => {
  const { Option } = Select;
  return (
    <div
      style={{
        display: visible ? 'block' : 'none'
      }}
    >
      <Form.Item
        label="Scenarios in Project"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 11, offset: 1 }}
      >
        {form.getFieldDecorator('copy-scenario', {
          initialValue: project.scenarios[0]
        })(
          <Select>
            {project.scenarios.map((scenario, index) => (
              <Option key={index} value={scenario}>
                {scenario}
              </Option>
            ))}
          </Select>
        )}
      </Form.Item>
    </div>
  );
};

export default ScenarioCopyDataForm;

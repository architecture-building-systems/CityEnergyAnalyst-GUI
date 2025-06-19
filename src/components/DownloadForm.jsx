import { Button, Checkbox, Form } from 'antd';
import { useProjectStore } from './Project/store';
import { useState } from 'react';
import { CloudDownloadOutlined } from '@ant-design/icons';

const DownloadForm = () => {
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    if (!values.scenarios.length) return;

    // TODO: Implement download
  };

  return (
    <div style={{ userSelect: 'none', padding: '12px 24px' }}>
      <div>
        <h1>
          <CloudDownloadOutlined style={{ fontSize: 36 }} /> Download
          Scenario(s)
        </h1>
        <p>Select one or more Scenarios to download.</p>
      </div>
      <Button type="primary" onClick={form.submit}>
        Download
      </Button>
      <FormContent form={form} onFinish={onFinish} />
    </div>
  );
};

const ScenarioCheckboxes = ({ onChange }) => {
  const scenariosList = useProjectStore((state) => state.scenariosList);
  const [checkedList, setCheckedList] = useState([]);
  const checkAll = scenariosList.length === checkedList.length;
  const indeterminate =
    checkedList.length > 0 && checkedList.length < scenariosList.length;

  const onChechboxChange = (list) => {
    setCheckedList(list);
    onChange?.(list);
  };
  const onCheckAllChange = (e) => {
    const newValue = e.target.checked ? scenariosList : [];
    setCheckedList(newValue);
    onChange?.(newValue);
  };

  if (scenariosList.length === 0) return null;

  return (
    <>
      <Checkbox
        style={{ marginBottom: 12 }}
        indeterminate={indeterminate}
        onChange={onCheckAllChange}
        checked={checkAll}
      >
        Select All
      </Checkbox>

      <Checkbox.Group
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginLeft: 12,
        }}
        value={checkedList}
        onChange={onChechboxChange}
      >
        {scenariosList.map((scenario) => (
          <Checkbox
            value={scenario}
            key={scenario}
            style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
          >
            {scenario}
          </Checkbox>
        ))}
      </Checkbox.Group>
    </>
  );
};

const FormContent = ({ form, onFinish }) => {
  return (
    <Form
      form={form}
      onFinish={onFinish}
      style={{ display: 'flex', flexDirection: 'column', margin: 12 }}
    >
      <Form.Item
        name="input-files"
        valuePropName="checked"
        initialValue={false}
      >
        <Checkbox>
          Check to download the input files only
          <br />
          (i.e. Building geometries, properties, streets, terrain, Database &
          weather)
        </Checkbox>
      </Form.Item>

      <div>
        <h2>Available Scenarios</h2>
        <Form.Item name="scenarios" initialValue={[]}>
          <ScenarioCheckboxes />
        </Form.Item>
      </div>
    </Form>
  );
};

export default DownloadForm;

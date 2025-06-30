import { Button, Form, Input, message, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/axios';
import { useProjectStore } from './store';
import { getValidateScenarioNameFunc } from '../../utils/project';

const DuplicateScenarioModal = ({
  visible,
  setVisible,
  project,
  currentScenarioName,
  scenarioList,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);

  const validateScenarioName = getValidateScenarioNameFunc(scenarioList);

  const onFinish = async (values) => {
    console.log('Received values of form: ', values);
    setLoading(true);
    try {
      await apiClient.post(
        `/api/project/scenario/${currentScenarioName}/duplicate`,
        {
          name: values.scenario_name,
        },
      );
      await fetchInfo(project);
      setVisible(false);
      message.success(
        'Successfully duplicated scenario as ' + values.scenario_name,
      );
    } catch (error) {
      console.error(error);
      message.error('Failed to duplicate scenario');
    } finally {
      setLoading(false);
    }
  };

  const onClick = () => {
    form.submit();
  };

  const onCancel = () => {
    setVisible(false);
  };

  useEffect(() => {
    form.setFieldsValue({ scenario_name: `${currentScenarioName} (copy)` });
  }, [form, currentScenarioName]);

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      closable={false}
      maskClosable={!loading}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="primary" onClick={onClick} loading={loading}>
            Duplicate
          </Button>
        </div>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>
            Duplicate Scenario
          </div>
        </div>
        <p style={{ fontSize: 14 }}>
          Current Scenario <b>{currentScenarioName}</b> will be duplicated.
          <br />
          Enter a new name for the new scenario.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Form form={form} onFinish={onFinish}>
            <Form.Item
              name="scenario_name"
              rules={[
                { required: true, message: 'Scenario name cannot be empty' },
                { validator: validateScenarioName },
              ]}
            >
              <Input placeholder="New Scenario Name" />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
};

export default DuplicateScenarioModal;

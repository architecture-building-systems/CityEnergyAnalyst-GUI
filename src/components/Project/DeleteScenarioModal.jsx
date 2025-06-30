import { Button, Input, message, Modal } from 'antd';
import { useState } from 'react';
import { useProjectStore } from './store';

const DeleteScenarioModal = ({ visible, setVisible, project, scenario }) => {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(null);
  const deleteScenario = useProjectStore((state) => state.deleteScenario);

  const disabled = value !== scenario;

  const onCancel = () => {
    setVisible(false);
    setValue(null);
  };

  const onClick = async () => {
    setLoading(true);
    try {
      await deleteScenario(project, scenario);
      setVisible(false);
      message.success('Successfully deleted Scenario ' + scenario);

      onCancel();
    } catch (error) {
      console.error(error);
      message.error('Failed to delete Scenario');
    } finally {
      setLoading(false);
    }
  };

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
          <Button
            type="primary"
            onClick={onClick}
            loading={loading}
            disabled={disabled}
            danger
          >
            Delete
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
            Delete Scenario
          </div>
        </div>
        <p>Are you sure you want to delete this Scenario?</p>

        <div style={{ fontWeight: 'bold' }}>{scenario}</div>

        <p>
          This will delete all data associated with this Scenario.
          <br />
          <i>This action cannot be undone.</i>
        </p>

        <p>Enter the name of the Scenario below to confirm.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Input
            placeholder={scenario}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default DeleteScenarioModal;

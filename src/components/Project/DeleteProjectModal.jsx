import { Button, Input, message, Modal } from 'antd';
import { useState } from 'react';
import { apiClient } from '../../api/axios';
import { useFetchProjectChoices } from './store';

const DeleteProjectModal = ({ visible, setVisible, project }) => {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(null);

  const [_, fetchProjectChoices] = useFetchProjectChoices();

  const disabled = value !== project;

  const onCancel = () => {
    setVisible(false);
    setValue(null);
  };

  const onClick = async () => {
    setLoading(true);
    try {
      await apiClient.delete(`/api/project/`, { data: { project } });
      setVisible(false);
      message.success('Successfully deleted project ' + project);
      await fetchProjectChoices();
      onCancel();
    } catch (error) {
      console.error(error);
      message.error('Failed to delete project');
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
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>Delete Project</div>
        </div>
        <p>Are you sure you want to delete this Project?</p>

        <div style={{ fontWeight: 'bold' }}>{project}</div>

        <p>
          This will delete all Scenarios and data associated with this Project.
          <br />
          <i>This action cannot be undone.</i>
        </p>

        <p>Enter the name of the Project below to confirm.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Input
            placeholder={project}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default DeleteProjectModal;

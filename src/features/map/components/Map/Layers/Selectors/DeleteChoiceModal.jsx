import { Button, Input, message, Modal } from 'antd';
import { CopyTwoTone } from '@ant-design/icons';
import { useState } from 'react';
import { apiClient } from 'lib/api/axios';

const DeleteChoiceModal = ({
  visible,
  setVisible,
  layerCategory,
  layerName,
  parameterName,
  parameterLabel,
  value,
  displayName,
  project,
  scenarioName,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const nameToConfirm = displayName ?? value;
  const disabled = confirmText !== nameToConfirm;

  const onCancel = () => {
    if (loading) return;
    setVisible(false);
    setConfirmText('');
  };

  const onConfirm = async () => {
    setLoading(true);
    try {
      await apiClient.post(
        `/api/map_layers/${layerCategory}/${layerName}/${parameterName}/choice/delete`,
        {
          project,
          scenario_name: scenarioName,
          value,
        },
      );
      message.success(`Deleted "${nameToConfirm}"`);
      onDeleted?.();
      setVisible(false);
      setConfirmText('');
    } catch (error) {
      console.error(error);
      message.error(
        error?.response?.data?.detail ?? `Failed to delete "${nameToConfirm}"`,
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(nameToConfirm);
      message.success('Name copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      message.error('Failed to copy to clipboard');
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
            onClick={onConfirm}
            loading={loading}
            disabled={disabled}
            danger
          >
            Delete
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 24, fontWeight: 'bold' }}>
          Delete {parameterLabel ?? 'item'}
        </div>
        <p>Are you sure you want to delete this?</p>

        <div
          style={{
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
          }}
        >
          {nameToConfirm}
          <Button
            style={{ fontSize: 18 }}
            size="small"
            icon={<CopyTwoTone />}
            onClick={copyToClipboard}
            title="Copy name to clipboard"
          />
        </div>

        <div
          style={{
            outline: 'rgba(255, 0, 0, 0.5) solid 1px',
            padding: 12,
            borderRadius: 8,
            margin: 12,
            background: 'rgba(255, 0, 0, 0.1)',
          }}
        >
          This will delete all files associated with this item on disk.
          <br />
          <i>This action cannot be undone.</i>
        </div>

        <p>Enter the name below to confirm.</p>
        <Input
          placeholder={nameToConfirm ?? ''}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default DeleteChoiceModal;

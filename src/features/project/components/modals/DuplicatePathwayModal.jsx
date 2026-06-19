import { Button, Form, Input, message, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { apiClient } from 'lib/api/axios';

const DuplicatePathwayModal = ({
  visible,
  setVisible,
  currentPathwayName,
  existingPathwayNames,
  onDuplicated,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const validateName = (_, value) => {
    if (!value || !value.trim()) {
      return Promise.reject('Pathway name cannot be empty');
    }
    if (existingPathwayNames?.includes(value.trim())) {
      return Promise.reject('A pathway with this name already exists');
    }
    return Promise.resolve();
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await apiClient.post(
        `/api/pathways/${encodeURIComponent(currentPathwayName)}/duplicate`,
        { name: values.pathway_name.trim() },
      );
      setVisible(false);
      message.success(
        `Successfully duplicated pathway as ${values.pathway_name.trim()}`,
      );
      onDuplicated?.(values.pathway_name.trim());
    } catch (error) {
      console.error(error);
      const detail = error?.response?.data?.detail;
      message.error(detail || 'Failed to duplicate pathway');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        pathway_name: `${currentPathwayName} (copy)`,
      });
    }
  }, [form, currentPathwayName, visible]);

  return (
    <Modal
      open={visible}
      onCancel={() => setVisible(false)}
      closable={false}
      maskClosable={!loading}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button onClick={() => setVisible(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={() => form.submit()}
            loading={loading}
          >
            Duplicate
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 24, fontWeight: 'bold' }}>
          Duplicate Pathway
        </div>
        <p style={{ fontSize: 14 }}>
          Pathway <b>{currentPathwayName}</b> will be duplicated.
          <br />
          Enter a name for the new pathway.
        </p>
        <Form form={form} onFinish={onFinish}>
          <Form.Item
            name="pathway_name"
            rules={[
              { required: true, message: 'Pathway name cannot be empty' },
              { validator: validateName },
            ]}
          >
            <Input placeholder="New Pathway Name" />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default DuplicatePathwayModal;

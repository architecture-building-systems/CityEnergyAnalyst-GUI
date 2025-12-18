import { Modal, Form, Input, Select } from 'antd';
import { useState } from 'react';
import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';

export const CreateComponentModal = ({
  isOpen,
  onClose,
  data,
  dataKey,
  indexColumn,
}) => {
  const [form] = Form.useForm();
  const storeData = useDatabaseEditorStore((state) => state.data);

  const handleAddNew = () => {
    form.submit();
  };

  const handleFormSubmit = (values) => {
    const newComponentName = values.componentName.toUpperCase().trim();
    const copyFromComponent = values.copyFrom;

    // Validate that the component doesn't already exist
    if (data && Object.keys(data).includes(newComponentName)) {
      form.setFields([
        {
          name: 'componentName',
          errors: ['Component already exists'],
        },
      ]);
      return;
    }

    // Clone data from the selected component
    const sourceComponentData = data?.[copyFromComponent];
    const componentData = sourceComponentData
      ? structuredClone(sourceComponentData)
      : [];

    const newData = structuredClone(storeData);

    // Navigate to the nested location and add the new component
    let current = newData;
    for (let i = 0; i < dataKey.length; i++) {
      const k = dataKey[i].toLowerCase();
      if (i === dataKey.length - 1) {
        // Last key - this is where we add
        if (!current[k]) current[k] = {};
        // Copy the component data (already an array from source component)
        current[k][newComponentName] = componentData;
      } else {
        if (!current[k]) current[k] = {};
        current = current[k];
      }
    }

    // Update store with new data and add change entry
    const currentState = useDatabaseEditorStore.getState();
    useDatabaseEditorStore.setState({
      data: newData,
      changes: [
        ...currentState.changes,
        {
          action: 'create',
          dataKey: [...dataKey, newComponentName],
          index: newComponentName,
          field: indexColumn,
          oldValue: '{}',
          value: JSON.stringify(componentData),
        },
      ],
    });

    // Close modal and reset form
    onClose();
    form.resetFields();
  };

  const handleCancel = () => {
    onClose();
    form.resetFields();
  };

  return (
    <Modal
      title="Create New Component"
      open={isOpen}
      onOk={handleAddNew}
      onCancel={handleCancel}
      okText="Create"
      cancelText="Cancel"
    >
      <Form
        form={form}
        onFinish={handleFormSubmit}
        layout="vertical"
        requiredMark="optional"
        initialValues={{
          copyFrom:
            data && Object.keys(data).length > 0
              ? Object.keys(data)[0]
              : undefined,
        }}
      >
        <Form.Item
          label="Component Name"
          name="componentName"
          rules={[
            { required: true, message: 'Please enter a component name' },
            {
              pattern: /^[A-Z0-9_]+$/,
              message: 'Use only uppercase letters, numbers, and underscores',
            },
          ]}
          normalize={(value) => value?.toUpperCase()}
        >
          <Input placeholder="e.g., BOILER_1, CHILLER_A" />
        </Form.Item>

        <Form.Item
          label="Copy From"
          name="copyFrom"
          rules={[
            {
              required: true,
              message: 'Please select a component to copy from',
            },
          ]}
        >
          <Select placeholder="Select a component to copy from">
            {data &&
              Object.keys(data).map((componentName) => (
                <Select.Option key={componentName} value={componentName}>
                  {componentName}
                </Select.Option>
              ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

import { Button, Form, Input, Modal, Tooltip } from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

export const AddRowButton = ({ index, schema, onAddRow }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    console.log(schema);
  }, [schema]);

  return (
    <div>
      <Button icon={<PlusOutlined />} onClick={() => setVisible(true)}>
        Add Row
      </Button>
      <AddRowModalForm
        index={index}
        schema={schema}
        visible={visible}
        setVisible={setVisible}
        onAddRow={onAddRow}
      />
    </div>
  );
};

const AddRowModalForm = ({ index, schema, visible, setVisible, onAddRow }) => {
  const [form] = Form.useForm();
  if (!schema?.columns) return null;

  const columns = Object.keys(schema.columns);

  const onOk = () => {
    form.submit();
  };

  const onCancel = () => {
    setVisible(false);
    form.resetFields();
  };

  const handleFinish = (values) => {
    onAddRow(values);
    setVisible(false);
    form.resetFields();
  };

  const renderFormItem = (col) => {
    const description = schema.columns[col]?.description;
    const label = (
      <span>
        {col}
        {description && (
          <Tooltip title={description}>
            <InfoCircleOutlined
              style={{ marginLeft: 4, color: '#8c8c8c', fontSize: 12 }}
            />
          </Tooltip>
        )}
      </span>
    );

    return (
      <Form.Item
        key={col}
        label={label}
        name={col}
        rules={[{ required: true, message: `Please input ${col}` }]}
      >
        <Input placeholder={`Enter ${col.toLowerCase()}`} />
      </Form.Item>
    );
  };

  return (
    <Modal
      title="Add New Row"
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      okText="Add"
      cancelText="Cancel"
      width={720}
      styles={{
        body: {
          paddingTop: 24,
        },
      }}
    >
      <Form
        form={form}
        onFinish={handleFinish}
        layout="vertical"
        requiredMark="optional"
      >
        {/* Index field first */}
        {renderFormItem(index)}

        {/* Other fields */}
        {columns.map((col) => {
          if (col !== index) {
            return renderFormItem(col);
          }
          return null;
        })}
      </Form>
    </Modal>
  );
};

import { Button, Form, Input, Modal, Tooltip } from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useEffect, useState, useMemo } from 'react';

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

  const MAX_ROWS_PER_COLUMN = 8;

  // Split fields into columns with max 8 rows each
  const fieldColumns = useMemo(() => {
    if (!schema?.columns) return [];
    const columns = Object.keys(schema.columns);
    const allFields = [index, ...columns.filter((col) => col !== index)];
    const result = [];
    for (let i = 0; i < allFields.length; i += MAX_ROWS_PER_COLUMN) {
      result.push(allFields.slice(i, i + MAX_ROWS_PER_COLUMN));
    }
    return result;
  }, [index, MAX_ROWS_PER_COLUMN, schema?.columns]);
  const numColumns = fieldColumns.length;

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

  if (!schema?.columns) return null;

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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
            gap: '0 24px',
          }}
        >
          {fieldColumns.map((columnFields, columnIndex) => (
            <div key={columnIndex}>
              {columnFields.map((field) => renderFormItem(field))}
            </div>
          ))}
        </div>
      </Form>
    </Modal>
  );
};

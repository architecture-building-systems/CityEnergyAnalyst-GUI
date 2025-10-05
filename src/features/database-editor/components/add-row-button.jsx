import { Button, Form, Input, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
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

  return (
    <Modal
      title="Add Row"
      open={visible}
      onCancel={() => setVisible(false)}
      onOk={onOk}
      okText="Add"
    >
      <Form form={form} onFinish={onAddRow}>
        <Form.Item
          label={index}
          name={index}
          help={<small>{schema.columns[index]?.description}</small>}
          required
        >
          <Input />
        </Form.Item>
        {columns.map((col) => {
          if (col !== index) {
            return (
              <Form.Item
                key={col}
                label={col}
                name={col}
                help={<small>{schema.columns[col]?.description}</small>}
                required
              >
                <Input />
              </Form.Item>
            );
          }
        })}
      </Form>
    </Modal>
  );
};

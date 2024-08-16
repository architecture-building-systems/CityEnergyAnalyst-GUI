import { Form, Button, Select, Divider } from 'antd';
import { useEffect } from 'react';
import { OpenDialogButton } from '../../Tools/Parameter';
import { FileSearchOutlined } from '@ant-design/icons';

const countryMap = {
  SG: 'Singapore',
  CH: 'Switzerland',
  DE: 'Germany',
};

const DatabaseForm = ({
  databases,
  initialValues,
  onChange,
  onBack,
  onFinish,
  onMount,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    onMount?.();
  }, []);

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onValuesChange={onChange}
      onFinish={onFinish}
      layout="vertical"
    >
      <Form.Item
        label="Database"
        name="database"
        extra="Select a Database from CEA or link to your own."
        rules={[{ required: true }]}
      >
        <Select
          placeholder="Choose an option from the dropdown"
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="database"
                type="directory"
                placeholder="Or enter path to database folder here"
              >
                <FileSearchOutlined />
                Browse for databases path
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: 'CEA Databases',
              options: databases.map((database) => ({
                label: `${database} - ${countryMap?.[database] || database}`,
                value: database,
              })),
            },
          ]}
        />
      </Form.Item>
      <Form.Item>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            style={{ padding: '0 36px' }}
          >
            Next
          </Button>
          <Button style={{ padding: '0 36px' }} onClick={onBack}>
            Back
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

export default DatabaseForm;

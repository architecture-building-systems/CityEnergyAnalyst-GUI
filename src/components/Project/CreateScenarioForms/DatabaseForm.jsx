import { Form, Button, Select, Divider } from 'antd';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { OpenDialogButton } from '../../Tools/Parameter';
import { PlusOutlined } from '@ant-design/icons';

export const useFetchDatabases = () => {
  const [databases, setDatabases] = useState([]);

  const fetchDatabases = async () => {
    const { data } = await axios.get(
      `${import.meta.env.VITE_CEA_URL}/api/databases/region`,
    );
    return data;
  };

  useEffect(() => {
    fetchDatabases().then(({ regions }) => setDatabases(regions));
  }, []);

  return databases;
};

const DatabaseForm = ({ databases, initialValues, onBack, onFinish }) => {
  const [form] = Form.useForm();

  const countryMap = {
    SG: 'Singapore',
    CH: 'Switzerland',
    DE: 'Germany',
  };

  return (
    <Form
      form={form}
      initialValues={initialValues}
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
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="database"
                type="directory"
                placeholder="or enter path to databases"
              >
                <PlusOutlined />
                Browse for databases path
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: <span>CEA Built-in</span>,
              title: 'CEA Built-in',
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

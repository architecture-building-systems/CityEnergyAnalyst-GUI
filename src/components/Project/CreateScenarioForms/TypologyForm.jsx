import { Button, Divider, Form, Select } from 'antd';
import { OpenDialogButton } from '../../Tools/Parameter';
import { useEffect } from 'react';
import axios from 'axios';
import { FileSearchOutlined } from '@ant-design/icons';
import { GENERATE_TYPOLOGY_CEA } from './constants';

const validateTypology = async (value) => {
  if (value === GENERATE_TYPOLOGY_CEA) return Promise.resolve();

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_CEA_URL}/api/geometry/typology/validate`,
      {
        type: 'path',
        path: value,
      },
    );
    console.log(response);
    return Promise.resolve();
  } catch (error) {
    const errorMessage =
      error?.response?.data?.detail || 'Unable to validate typology.';
    return Promise.reject(`${errorMessage}`);
  }
};

const TypologyForm = ({
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
        label="Building information (typology)"
        name="typology"
        extra={
          <div>
            <br />
            <div>
              Link to a path to building information in .xlsx/.csv/.dbf format.
            </div>
            <div>See an example here.</div>
            <br />
            <div>You can leave it empty and modify it later.</div>
          </div>
        }
        rules={[{ validator: (_, value) => validateTypology(value) }]}
      >
        <Select
          placeholder="Choose an option from the dropdown"
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="typology"
                type="file"
                filters={[{ name: 'DBF files', extensions: ['dbf'] }]}
                placeholder="Or enter path to typology file here"
              >
                <FileSearchOutlined />
                Browse for typology file
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: 'Defaults',
              options: [
                {
                  label: 'Auto-generate using default values',
                  value: GENERATE_TYPOLOGY_CEA,
                },
              ],
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

export default TypologyForm;

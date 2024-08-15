import { Button, Form } from 'antd';
import { OpenDialogInput } from '../../Tools/Parameter';
import { useEffect } from 'react';

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
      >
        <OpenDialogInput
          form={form}
          name="typology"
          type="file"
          filters={[{ name: 'DBF files', extensions: ['dbf'] }]}
          placeholder="Leave empty to auto-generate default"
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

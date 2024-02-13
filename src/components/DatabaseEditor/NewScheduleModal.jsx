import { useRef } from 'react';
import { Form } from '@ant-design/compatible';
import { Modal, Select } from 'antd';
import { FormItemWrapper } from '../Tools/Parameter';

const NewScheduleModal = ({
  scheduleNames,
  onSuccess,
  visible,
  setVisible,
}) => {
  const formRef = useRef();

  const handleOk = () => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        console.log('Received values of form: ', values);
        onSuccess(values);
        setVisible(false);
      }
    });
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <Modal
      title="Add new Archetype Schedule"
      open={visible}
      width={800}
      okText="Add"
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnClose
    >
      <NewProjectForm ref={formRef} scheduleNames={scheduleNames} />
    </Modal>
  );
};

const NewProjectForm = Form.create()(({ form, scheduleNames }) => {
  return (
    <Form layout="horizontal">
      <FormItemWrapper
        form={form}
        name="name"
        initialValue=""
        help="Name of new Archetype Schedule"
        required={true}
        rules={[
          {
            validator: (rule, value, callback) => {
              if (scheduleNames.includes(value)) {
                callback('Schedule with name already exists');
              } else if (value !== value.toUpperCase()) {
                callback('Name must be in uppercase');
              } else {
                callback();
              }
            },
          },
        ]}
      />
      <FormItemWrapper
        form={form}
        name="copy"
        initialValue={scheduleNames[0]}
        help="Copy from existing schedule"
        inputComponent={
          <Select disabled={!scheduleNames.length}>
            {scheduleNames.map((name) => (
              <Select.Option key={name} value={name}>
                {name}
              </Select.Option>
            ))}
          </Select>
        }
      />
    </Form>
  );
});

export default NewScheduleModal;

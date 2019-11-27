import React, { useRef, useState } from 'react';
import { Modal, Form } from 'antd';
import axios from 'axios';
import parameter from '../Tools/parameter';

const OpenProjectModal = ({
  visible,
  setVisible,
  project,
  onSuccess = () => {}
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();

  const handleOk = () => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        try {
          const openProject = await axios.put(
            `http://localhost:5050/api/project/`,
            values
          );
          console.log(openProject.data);
          onSuccess();
          setVisible(false);
        } catch (err) {
          console.log(err.response);
        } finally {
          setConfirmLoading(false);
        }
      }
    });
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <Modal
      title="Open Project"
      visible={visible}
      width={800}
      okText="Open"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <OpenProjectForm ref={formRef} project={project} />
    </Modal>
  );
};

const OpenProjectForm = Form.create()(({ form, project }) => {
  return (
    <Form>
      {parameter(
        {
          type: 'PathParameter',
          name: 'path',
          value: project.path,
          help: 'Path of Project'
        },
        form
      )}
    </Form>
  );
});

export default OpenProjectModal;

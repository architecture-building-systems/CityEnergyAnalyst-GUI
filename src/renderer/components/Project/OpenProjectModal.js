import React, { useRef, useState, useEffect } from 'react';
import { Modal, Form } from 'antd';
import path from 'path';
import { FormItemWrapper, OpenDialogInput } from '../Tools/Parameter';
import { useFetchConfigProjectInfo, useFetchProject } from '../Project/Project';

const OpenProjectModal = ({ visible, setVisible, onSuccess = () => {} }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();
  const {
    info: { project },
    fetchInfo,
  } = useFetchConfigProjectInfo();
  const fetchProject = useFetchProject();

  useEffect(() => {
    if (visible) fetchInfo();
  }, [visible]);

  const handleOk = () => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        console.log('Received values of form: ', values);
        setConfirmLoading(true);
        const { project } = values;
        fetchProject(project).then(() => {
          setConfirmLoading(false);
          setVisible(false);
          onSuccess();
        });
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
      <OpenProjectForm ref={formRef} initialValue={project} />
    </Modal>
  );
};

const OpenProjectForm = Form.create()(({ form, initialValue }) => {
  return (
    <Form>
      <FormItemWrapper
        form={form}
        name="project"
        initialValue={initialValue}
        help="Path of Project"
        rules={[
          {
            validator: (rule, value, callback) => {
              if (path.resolve(value) !== value) {
                callback('Path entered is invalid');
              } else {
                callback();
              }
            },
          },
        ]}
        inputComponent={<OpenDialogInput form={form} type="PathParameter" />}
      />
    </Form>
  );
});

export default OpenProjectModal;

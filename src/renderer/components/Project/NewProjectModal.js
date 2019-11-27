import React, { useState, useRef } from 'react';
import { Modal, Form } from 'antd';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import parameter from '../Tools/parameter';

const NewProjectModal = ({
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
          const createProject = await axios.post(
            `http://localhost:5050/api/project/`,
            values
          );
          console.log(createProject.data);
          const updateProject = await axios.put(
            `http://localhost:5050/api/project/`,
            {
              path: path.join(values.path, values.name)
            }
          );
          console.log(updateProject.data);
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

  const handleCancel = e => {
    setVisible(false);
  };

  return (
    <Modal
      title="Create new Project"
      visible={visible}
      width={800}
      okText="Create"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <NewProjectForm ref={formRef} project={project} />
    </Modal>
  );
};

const NewProjectForm = Form.create()(({ form, project }) => {
  return (
    <Form layout="horizontal">
      {parameter(
        {
          type: 'InputParameter',
          name: 'name',
          value: '',
          help: 'Name of new Project'
        },
        form,
        {
          rules: [
            { required: true },
            {
              validator: (rule, value, callback) => {
                if (
                  value.length != 0 &&
                  fs.existsSync(path.join(form.getFieldValue('path'), value))
                ) {
                  callback('Folder with name already exists in path');
                } else {
                  callback();
                }
              }
            }
          ]
        }
      )}
      {parameter(
        {
          type: 'PathParameter',
          name: 'path',
          value: path.dirname(project.path),
          help: 'Path of new Project'
        },
        form
      )}
    </Form>
  );
});

export default NewProjectModal;

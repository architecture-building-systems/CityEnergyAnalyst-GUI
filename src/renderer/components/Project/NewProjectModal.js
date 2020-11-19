import React, { useState, useRef, useEffect } from 'react';
import { Modal, Form } from 'antd';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { FormItemWrapper, OpenDialogInput } from '../Tools/Parameter';
import { remote } from 'electron';
import { useFetchConfigProjectInfo, useFetchProject } from '../Project/Project';

const NewProjectModal = ({ visible, setVisible, onSuccess = () => {} }) => {
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
        try {
          const resp = await axios.post(
            `http://${process.env.CEA_URL}/api/project/`,
            values
          );
          const { project } = resp.data;
          fetchProject(project).then(() => {
            setConfirmLoading(false);
            setVisible(false);
            onSuccess();
          });
        } catch (err) {
          console.log(err.response);
          setConfirmLoading(false);
        }
      }
    });
  };

  const handleCancel = (e) => {
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
      <NewProjectForm
        ref={formRef}
        initialValue={
          project
            ? require('path').dirname(project)
            : remote.app.getPath('home')
        }
      />
    </Modal>
  );
};

const NewProjectForm = Form.create()(({ form, initialValue }) => {
  return (
    <Form layout="horizontal">
      <FormItemWrapper
        form={form}
        name="project_name"
        initialValue=""
        help="Name of new Project"
        required={true}
        rules={[
          {
            validator: (rule, value, callback) => {
              if (
                value.length != 0 &&
                fs.existsSync(
                  path.join(form.getFieldValue('project_root'), value)
                )
              ) {
                callback('Folder with name already exists in path');
              } else {
                callback();
              }
            },
          },
        ]}
      />
      <FormItemWrapper
        form={form}
        name="project_root"
        initialValue={initialValue}
        help="Path of new Project"
        rules={[
          {
            validator: (rule, value, callback) => {
              if (value.length !== 0 && path.resolve(value) !== value) {
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

export default NewProjectModal;

import { useState, useRef, useEffect } from 'react';
import { Form } from '@ant-design/compatible';
import { Modal } from 'antd';
import axios from 'axios';
import { FormItemWrapper, OpenDialogInput } from '../Tools/Parameter';
import { useFetchConfigProjectInfo, useFetchProject } from '../Project/Project';
import { checkExist, dirname, joinPath } from '../../utils/file';

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
            `${import.meta.env.VITE_CEA_URL}/api/project/`,
            values,
          );
          const { project } = resp.data;
          fetchProject(project).then(() => {
            setConfirmLoading(false);
            setVisible(false);
            onSuccess();
          });
        } catch (err) {
          console.error(err.response);
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
      title="Create new Project"
      open={visible}
      width={800}
      okText="Create"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <NewProjectForm
        ref={formRef}
        initialValue={project ? dirname(project) : null}
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
            validator: async (rule, value, callback) => {
              const contentPath = joinPath(
                form.getFieldValue('project_root'),
                value,
              );
              const pathExists = await checkExist('', 'directory', contentPath);
              if (value.length != 0 && pathExists) {
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
            validator: async (rule, value, callback) => {
              if (value.length == 0) {
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

import { useState, useEffect, useMemo } from 'react';
import { Form, Input, Modal } from 'antd';
import axios from 'axios';
import { OpenDialogInput } from '../Tools/Parameter';
import { useFetchConfigProjectInfo } from '../Project/Project';
import { checkExist, dirname, joinPath, sanitizePath } from '../../utils/file';
import { useFetchProject } from '../../utils/hooks';
import { isElectron } from '../../utils/electron';

const NewProjectModal = ({ visible, setVisible, onSuccess = () => {} }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [form] = Form.useForm();
  const { info, fetchInfo } = useFetchConfigProjectInfo();
  const initialValue = useMemo(
    () => (info?.project ? dirname(info.project) : null),
    [info?.project],
  );
  const fetchProject = useFetchProject();

  useEffect(() => {
    if (visible) fetchInfo();
  }, [visible]);

  const onFinish = async (values) => {
    try {
      setConfirmLoading(true);
      const resp = await axios.post(
        `${import.meta.env.VITE_CEA_URL}/api/project/`,
        values,
      );
      const { project } = resp.data;
      fetchProject(project).then(() => {
        setConfirmLoading(false);
        setVisible(false);
        onSuccess();
        form.resetFields();
      });
    } catch (e) {
      console.log(e);
    } finally {
      setConfirmLoading(false);
    }
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
      onOk={form.submit}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      {initialValue && (
        <NewProjectForm
          form={form}
          onFinish={onFinish}
          initialValue={initialValue}
          project={info}
        />
      )}
    </Modal>
  );
};

const NewProjectForm = ({ form, onFinish, initialValue, project }) => {
  return (
    <Form
      form={form}
      onFinish={onFinish}
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 15, offset: 1 }}
    >
      <Form.Item
        name="project_name"
        label="Project Name"
        extra="Name of new Project"
        validateFirst
        rules={[
          { required: true, message: 'Project name cannot be empty' },
          {
            validator: async (_, value) => {
              const projectRoot = form.getFieldValue('project_root');

              // Sanitize the path if project root is set
              if (!isElectron() && projectRoot !== '') {
                try {
                  sanitizePath(projectRoot, value, 1);
                } catch (err) {
                  console.error(err)
                  return Promise.reject('Path entered is invalid');
                }
              }

              const contentPath = joinPath(projectRoot, value);
              const pathExists = await checkExist('', 'directory', contentPath);
              if (value.length != 0 && pathExists) {
                return Promise.reject('project name already exists in path');
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input placeholder="new_project" autoComplete="off" />
      </Form.Item>

      {/* Only allow project root to be set if it is not already set */}
      <Form.Item
        name="project_root"
        label="Project Root"
        initialValue={initialValue}
        extra="Path of new Project"
        rules={[
          {
            validator: async (_, value) => {
              if (value.length == 0) {
                return Promise.reject('Path entered is invalid');
              }

              return Promise.resolve();
            },
          },
        ]}
        hidden={project?.projects}
      >
        <OpenDialogInput form={form} type="directory" />
      </Form.Item>
    </Form>
  );
};

export default NewProjectModal;

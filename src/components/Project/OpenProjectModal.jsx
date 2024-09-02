import { useState, useEffect, useMemo } from 'react';
import { Form, Modal, Select } from 'antd';
import { OpenDialogInput } from '../Tools/Parameter';
import { useFetchConfigProjectInfo } from '../Project/Project';
import { checkExist, dirname, joinPath } from '../../utils/file';
import { useFetchProject } from '../../utils/hooks';

const OpenProjectModal = ({ visible, setVisible, onSuccess = () => {} }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [form] = Form.useForm();
  const { info, fetchInfo } = useFetchConfigProjectInfo();
  const { project } = info;
  const fetchProject = useFetchProject();

  useEffect(() => {
    if (visible) fetchInfo();
  }, [visible]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      const { project } = values;
      fetchProject(project).then(() => {
        setConfirmLoading(false);
        setVisible(false);
        onSuccess();
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <Modal
      title="Open Project"
      open={visible}
      width={800}
      okText="Open"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      {project && (
        <OpenProjectForm form={form} initialValue={project} project={info} />
      )}
    </Modal>
  );
};

const OpenProjectForm = ({ form, initialValue, project }) => {
  const projectOptions = useMemo(() => {
    // FIXME: This is a workaround to get the project root
    const projectRoot = project?.project ? dirname(project?.project) : '';
    const projectList = project?.projects || [];

    return projectList.map((projectName) => ({
      label: projectName,
      value: joinPath(projectRoot, projectName),
    }));
  }, [project]);

  return (
    <Form
      form={form}
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 15, offset: 1 }}
    >
      <Form.Item
        label="Project"
        name="project"
        initialValue={initialValue}
        extra="Path of Project"
        rules={[
          {
            validator: async (_, value) => {
              const pathExists = await checkExist('', 'directory', value);
              if (!pathExists) {
                return Promise.reject('Path entered is invalid');
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        {projectOptions ? (
          <Select placeholder="project_root" options={projectOptions} />
        ) : (
          <OpenDialogInput form={form} type="directory" />
        )}
      </Form.Item>
    </Form>
  );
};

export default OpenProjectModal;

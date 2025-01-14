import { useEffect, useState } from 'react';
import { Form, Modal, Select } from 'antd';
import { OpenDialogInput } from '../Tools/Parameter';
import { checkExist } from '../../utils/file';
import { useProjectStore } from './store';
import { isElectron } from '../../utils/electron';
import axios from 'axios';

const OpenProjectModal = ({ visible, setVisible, onSuccess }) => {
  const project = useProjectStore((state) => state.project);
  const updateScenario = useProjectStore((state) => state.updateScenario);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async ({ project }) => {
    setConfirmLoading(true);
    try {
      updateScenario(null);
      await fetchInfo(project);
      setConfirmLoading(false);
      setVisible(false);
      onSuccess?.();
    } catch (e) {
      console.log(e);
      setConfirmLoading(false);
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
      onOk={form.submit}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <OpenProjectForm form={form} onFinish={onFinish} initialValue={project} />
    </Modal>
  );
};

const PathDialog = ({ initialValue }) => {
  return (
    <Form.Item
      label="Project"
      name="project"
      initialValue={initialValue}
      extra="Path of Project"
      rules={[
        {
          validator: async (_, value) => {
            if (value.length == 0)
              return Promise.reject('Project cannot be empty');
            await checkExist(value, 'directory');
            return Promise.resolve();
          },
        },
      ]}
    >
      <OpenDialogInput type="directory" />
    </Form.Item>
  );
};

const useFetchProjectChoices = () => {
  const [choices, setChoices] = useState();

  const fetchInfo = async () => {
    try {
      const resp = await axios.get(
        `${import.meta.env.VITE_CEA_URL}/api/project/choices`,
      );
      const _choices = resp.data?.projects;
      setChoices(_choices);
    } catch (err) {
      console.error(err?.response?.data);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  return choices;
};

const ProjectChoice = ({ initialValue }) => {
  const choices = useFetchProjectChoices();

  const options = choices
    ? choices.map((choice) => ({
        label: choice,
        value: choice,
      }))
    : [];

  return (
    <Form.Item label="Project" name="project">
      <Select placeholder="Select a project" options={options} />
    </Form.Item>
  );
};

const OpenProjectForm = ({ form, onFinish, initialValue }) => {
  return (
    <Form
      form={form}
      onFinish={onFinish}
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 15, offset: 1 }}
    >
      {isElectron() ? (
        <PathDialog initialValue={initialValue} />
      ) : (
        <ProjectChoice initialValue={initialValue} />
      )}
    </Form>
  );
};

export default OpenProjectModal;

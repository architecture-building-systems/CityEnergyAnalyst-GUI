import { useState, useRef } from 'react';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal } from 'antd';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { FormItemWrapper } from '../Tools/Parameter';
import { useFetchProject } from './Project';

const RenameScenarioModal = ({
  scenarioName,
  project,
  visible,
  setVisible,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();
  const fetchProject = useFetchProject();

  const handleOk = (e) => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        try {
          const resp = await axios.put(
            `${process.env.CEA_URL}/api/project/scenario/${scenarioName}`,
            values
          );
          console.log(resp.data);
          fetchProject();
          setVisible(false);
        } catch (err) {
          console.error(err.response);
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
      title="Rename Scenario"
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      centered
      destroyOnClose
    >
      <h2>Current Name: {scenarioName}</h2>
      <RenameScenarioForm ref={formRef} project={project} />
    </Modal>
  );
};

const RenameScenarioForm = Form.create()(({ form, project }) => {
  const checkName = (project, name) => {
    const dirs = fs
      .readdirSync(project)
      .filter((f) => fs.statSync(path.join(project, f)).isDirectory());
    return dirs.includes(name);
  };

  return (
    <Form layout="horizontal">
      <FormItemWrapper
        form={form}
        name="name"
        initialValue=""
        help="New Scenario Name"
        required={true}
        rules={[
          {
            validator: (rule, value, callback) => {
              if (
                value.length != 0 &&
                checkName(project, form.getFieldValue('name'))
              ) {
                callback('Scenario with name already exists in the project');
              } else {
                callback();
              }
            },
          },
        ]}
      />
    </Form>
  );
});

export default RenameScenarioModal;

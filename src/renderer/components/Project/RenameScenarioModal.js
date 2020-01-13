import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Modal, Form } from 'antd';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getProject } from '../../actions/project';
import { FormItemWrapper } from '../Tools/parameter';

const RenameScenarioModal = ({
  scenario,
  projectPath,
  visible,
  setVisible
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();
  const dispatch = useDispatch();

  const reloadProject = () => {
    dispatch(getProject());
  };

  const handleOk = e => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        try {
          const resp = await axios.put(
            `http://localhost:5050/api/project/scenario/${scenario}`,
            values
          );
          console.log(resp.data);
          reloadProject();
          setVisible(false);
        } catch (err) {
          console.log(err.response);
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
      title="Rename Scenario"
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      centered
      destroyOnClose
    >
      <h2>Current Name: {scenario}</h2>
      <RenameScenarioForm ref={formRef} projectPath={projectPath} />
    </Modal>
  );
};

const RenameScenarioForm = Form.create()(({ form, projectPath }) => {
  const checkName = (projectPath, name) => {
    const dirs = fs
      .readdirSync(projectPath)
      .filter(f => fs.statSync(path.join(projectPath, f)).isDirectory());
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
                checkName(projectPath, form.getFieldValue('name'))
              ) {
                callback('Scenario with name already exists in the project');
              } else {
                callback();
              }
            }
          }
        ]}
      />
    </Form>
  );
});

export default RenameScenarioModal;

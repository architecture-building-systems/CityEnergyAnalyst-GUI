import React, { useState, useRef } from 'react';
import { Modal, Form, message } from 'antd';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { FormItemWrapper, OpenDialogInput } from '../Tools/Parameter';

const ExportDatabaseModal = ({ visible, setVisible }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();

  const handleOk = () => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        try {
          const resp = axios.put(
            'http://localhost:5050/api/inputs/databases/copy',
            values
          );
          setConfirmLoading(false);
          setVisible(false);
          message.config({
            top: 120
          });
          message.success('Database succesfully exported');
        } catch (err) {
          console.log(err.response);
          setConfirmLoading(false);
          message.config({
            top: 120
          });
          message.error('Something went wrong.');
        }
      }
    });
  };

  const handleCancel = e => {
    setVisible(false);
  };

  return (
    <Modal
      title="Export current Database"
      visible={visible}
      width={800}
      okText="Export"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <ExportForm ref={formRef} />
    </Modal>
  );
};

const ExportForm = Form.create()(({ form }) => {
  return (
    <Form layout="horizontal">
      <FormItemWrapper
        form={form}
        name="name"
        initialValue=""
        help="Name of Database"
        required={true}
        rules={[
          {
            validator: (rule, value, callback) => {
              if (
                value.length != 0 &&
                form.getFieldValue('path').length != 0 &&
                fs.existsSync(path.join(form.getFieldValue('path'), value))
              ) {
                callback('Folder with name already exists in path');
              } else {
                callback();
              }
            }
          }
        ]}
      />
      <FormItemWrapper
        form={form}
        name="path"
        initialValue=""
        help="Path to export Database"
        required={true}
        inputComponent={<OpenDialogInput form={form} type="PathParameter" />}
      />
    </Form>
  );
});

export default ExportDatabaseModal;

import { useState, useRef } from 'react';
import { Form } from '@ant-design/compatible';
import { Modal, message, Alert } from 'antd';
import { FormItemWrapper, OpenDialogInput } from '../Tools/Parameter';
import { checkExist, joinPath } from '../../utils/file';
import { apiClient } from '../../api/axios';

const ExportDatabaseModal = ({ visible, setVisible }) => {
  const databaseChanges = useSelector((state) => state.databaseEditor.changes);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();

  const handleOk = () => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        try {
          apiClient.put(`/api/inputs/databases/copy`, values);
          setConfirmLoading(false);
          setVisible(false);
          message.config({
            top: 120,
          });
          message.success('Database successfully exported');
        } catch (err) {
          console.error(err.response);
          setConfirmLoading(false);
          message.config({
            top: 120,
          });
          message.error('Something went wrong.');
        }
      }
    });
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <Modal
      title="Export current Database"
      open={visible}
      width={800}
      okText="Export"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnHidden
    >
      {!!databaseChanges.length && (
        <div style={{ marginBottom: 30 }}>
          <Alert
            message="ATTENTION"
            type="warning"
            showIcon
            description="There seems to be unsaved changes. These changes will only be present
        in the exported database and not in the current one if they are not
        saved. It is advised to save these changes before proceeding."
          />
        </div>
      )}
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
            validator: async (rule, value, callback) => {
              if (value.length != 0) {
                const contentPath = joinPath(form.getFieldValue('path'), value);
                const pathExists = await checkExist(
                  '',
                  'directory',
                  contentPath,
                );
                if (pathExists)
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
        name="path"
        initialValue=""
        help="Path to export Database"
        required={true}
        inputComponent={<OpenDialogInput form={form} type="directory" />}
      />
    </Form>
  );
});

export default ExportDatabaseModal;

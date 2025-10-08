import { useState, useRef } from 'react';
import { Form } from '@ant-design/compatible';
import { Modal, message, Alert } from 'antd';
import { FormItemWrapper, OpenDialogInput } from 'components/Parameter';
import { checkExist } from 'utils/file';
import { apiClient } from 'lib/api/axios';
import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';

const ImportDatabaseModal = ({ visible, setVisible }) => {
  const databaseChanges = useDatabaseEditorStore((state) => state.changes);
  const initDatabaseState = useDatabaseEditorStore(
    (state) => state.initDatabaseState,
  );
  const resetDatabaseChanges = useDatabaseEditorStore(
    (state) => state.resetDatabaseChanges,
  );
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();

  const handleOk = () => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        try {
          await apiClient.post(`/api/inputs/databases/upload`, values);
          // Reload the database after successful upload
          await initDatabaseState();
          resetDatabaseChanges();
          setConfirmLoading(false);
          setVisible(false);
          message.config({
            top: 120,
          });
          message.success('Database successfully uploaded');
        } catch (err) {
          console.error(err.response);
          setConfirmLoading(false);
          message.config({
            top: 120,
          });
          message.error(
            err.response?.data?.detail || 'Failed to upload database.',
          );
        }
      }
    });
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <Modal
      title="Upload Database"
      open={visible}
      width={800}
      okText="Upload"
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
            description="There are unsaved changes. These changes will be lost when uploading a new database. It is advised to save these changes before proceeding."
          />
        </div>
      )}
      <ImportForm ref={formRef} />
    </Modal>
  );
};

const ImportForm = Form.create()(({ form }) => {
  return (
    <Form layout="horizontal">
      <FormItemWrapper
        form={form}
        name="path"
        initialValue=""
        help="Path to the database folder to import"
        required={true}
        inputComponent={<OpenDialogInput form={form} type="directory" />}
        rules={[
          {
            validator: async (rule, value, callback) => {
              if (value.length !== 0) {
                const pathExists = await checkExist('', 'directory', value);
                if (!pathExists) {
                  callback('The selected folder does not exist');
                }
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

export default ImportDatabaseModal;

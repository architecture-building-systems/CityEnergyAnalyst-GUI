import { useState, useMemo } from 'react';
import { Modal, message, Alert, Upload, Button } from 'antd';
import Dragger from 'antd/es/upload/Dragger';
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
  const [fileList, setFileList] = useState([]);
  const [hideBox, setHideBox] = useState(false);

  const handleOk = async () => {
    if (fileList.length === 0) {
      message.error('Please select a zip file to upload');
      return;
    }

    setConfirmLoading(true);
    const formData = new FormData();
    formData.append('file', fileList[0].originFileObj);

    try {
      await apiClient.post(`/api/inputs/databases/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Reload the database after successful upload
      await initDatabaseState();
      resetDatabaseChanges();
      setConfirmLoading(false);
      setVisible(false);
      setFileList([]);
      setHideBox(false);
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
      message.error(err.response?.data?.detail || 'Failed to upload database.');
    }
  };

  const handleCancel = () => {
    setVisible(false);
    setFileList([]);
    setHideBox(false);
  };

  const beforeUpload = async (file) => {
    // Do basic checks first
    try {
      const validZipTypes = [
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream',
      ];
      const isValidZip = validZipTypes.includes(file.type);

      if (!isValidZip && !file.name.toLowerCase().endsWith('.zip')) {
        throw new Error('File type must be .zip');
      }

      const fileSizeInKB = file.size / 1024;
      if (fileSizeInKB > 500) {
        throw new Error('File size must be less than 500KB');
      }

      setHideBox(true);
    } catch (e) {
      console.error(e);
      message.error(e.message);
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handleOnChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleOnRemove = () => {
    setHideBox(false);
    setFileList([]);
  };

  const _fileList = useMemo(
    () =>
      fileList?.map((file) => ({
        ...file,
        status: confirmLoading ? 'uploading' : 'done',
      })),
    [fileList, confirmLoading],
  );

  return (
    <Modal
      title="Upload Database"
      open={visible}
      width={800}
      okText="Upload"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      maskClosable={false}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={confirmLoading}>
          Cancel
        </Button>,
        <Button
          key="upload"
          type="primary"
          onClick={handleOk}
          loading={confirmLoading}
          disabled={fileList.length === 0}
        >
          Upload
        </Button>,
      ]}
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
      <Dragger
        accept=".zip"
        maxCount={1}
        beforeUpload={beforeUpload}
        onChange={handleOnChange}
        onRemove={handleOnRemove}
        disabled={confirmLoading}
        showUploadList={{
          extra: ({ size = 0 }) => (
            <span style={{ color: '#cccccc' }}>
              {' '}
              ({(size / 1024 / 1024).toFixed(2)}MB)
            </span>
          ),
          showRemoveIcon: true,
        }}
        style={{
          background: '#8eb6dc',
          color: '#fff',
          display: hideBox ? 'none' : 'block',
        }}
        fileList={_fileList}
      >
        <p className="antd-upload-text">
          {'Click or drag your .zip file containing the database.'}
        </p>
      </Dragger>
    </Modal>
  );
};

export default ImportDatabaseModal;

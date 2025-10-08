import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { Button } from 'antd';
import ImportDatabaseModal from 'features/database-editor/components/DatabaseEditor/ImportDatabaseModal';
import { useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';

export const ImportDatabaseButton = () => {
  const { status } = useDatabaseEditorStore((state) => state.status);
  const [modalVisible, setModalVisible] = useState(false);

  if (status !== 'success') return null;

  return (
    <>
      <Button
        icon={<UploadOutlined />}
        onClick={() => {
          setModalVisible(true);
        }}
      >
        Upload
      </Button>
      <ImportDatabaseModal
        visible={modalVisible}
        setVisible={setModalVisible}
      />
    </>
  );
};

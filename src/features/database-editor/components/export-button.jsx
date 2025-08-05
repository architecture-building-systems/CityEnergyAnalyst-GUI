import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { Button } from 'antd';
import ExportDatabaseModal from 'features/database-editor/components/DatabaseEditor/ExportDatabaseModal';
import { useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';

export const ExportDatabaseButton = () => {
  const { status } = useDatabaseEditorStore((state) => state.status);
  const databaseValidation = useDatabaseEditorStore(
    (state) => state.validation,
  );
  const [modalVisible, setModalVisible] = useState(false);

  if (status !== 'success') return null;

  return (
    <>
      <Button
        icon={<UploadOutlined />}
        disabled={!!Object.keys(databaseValidation).length}
        onClick={() => {
          setModalVisible(true);
        }}
      >
        Export
      </Button>
      <ExportDatabaseModal
        visible={modalVisible}
        setVisible={setModalVisible}
      />
    </>
  );
};

import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { apiClient } from 'lib/api/axios';
import { Button } from 'antd';
import SavingDatabaseModal from 'features/database-editor/components/DatabaseEditor/SavingDatabaseModal';
import { useState } from 'react';

export const SaveDatabaseButton = () => {
  const databasesData = useDatabaseEditorStore((state) => state.data);
  const databaseValidation = useDatabaseEditorStore(
    (state) => state.validation,
  );
  const databaseChanges = useDatabaseEditorStore((state) => state.changes);
  const resetDatabaseChanges = useDatabaseEditorStore(
    (state) => state.resetDatabaseChanges,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const disabled =
    !!Object.keys(databaseValidation).length || !databaseChanges.length;

  const hideModal = () => {
    setModalVisible(false);
    setSuccess(null);
    setError(null);
  };

  const saveDB = async () => {
    setModalVisible(true);
    try {
      console.log(databasesData);
      await apiClient.put(`/api/inputs/databases`, databasesData);
      setSuccess(true);
      resetDatabaseChanges();
    } catch (err) {
      console.error(err.response);
      setError(err.response);
    }
  };

  return (
    <>
      <Button
        // Disable button if there are validation errors or if there are no changes to data
        disabled={disabled}
        onClick={saveDB}
      >
        Save Changes
      </Button>
      <SavingDatabaseModal
        visible={modalVisible}
        hideModal={hideModal}
        error={error}
        success={success}
      />
    </>
  );
};

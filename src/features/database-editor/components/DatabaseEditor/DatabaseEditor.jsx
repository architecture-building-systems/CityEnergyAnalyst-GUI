import { useState, useEffect } from 'react';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { withErrorBoundary } from 'utils/ErrorBoundary';
import CenterSpinner from 'components/CenterSpinner';
import ExportDatabaseModal from './ExportDatabaseModal';
import './DatabaseEditor.css';
import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { AsyncError } from 'components/AsyncError';
import SavingDatabaseModal from './SavingDatabaseModal';
import DatabaseTopMenu from './DatabaseTopMenu';
import Database from './Database';
import UseTypesDatabase from './UseTypesDatabase';
import ValidationErrors from './ValidationErrors';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';

const useValidateDatabasePath = () => {
  const [valid, setValid] = useState(null);
  const [error, setError] = useState(null);

  const checkDBPathValidity = async () => {
    try {
      setValid(null);
      setError(null);
      await apiClient.get(`/api/inputs/databases/check`);
      setValid(true);
    } catch (err) {
      if (err.response) setError(err.response.data.message);
      else setError('Could not read and verify databases.');
      setValid(false);
    }
  };

  useEffect(() => {
    checkDBPathValidity();
  }, []);

  return [valid, error, checkDBPathValidity];
};

const DatabaseEditor = () => {
  const scenarioName = useProjectStore((state) => state.scenario);

  const [valid, error, checkDBPathValidity] = useValidateDatabasePath();

  if (scenarioName === null) return <div>No scenario selected.</div>;
  if (valid === null)
    return (
      <CenterSpinner
        indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
        tip="Verifying Databases..."
      />
    );

  return (
    <div className="cea-database-editor">
      <div className="cea-database-editor-header">
        <h2>Database Editor</h2>
        <div>
          <ExportDatabaseButton />
        </div>
      </div>
      <div className="cea-database-editor-content">
        {valid ? (
          <DatabaseContent />
        ) : (
          <div>
            <div style={{ margin: 20 }}>
              <h3>
                Could not find or validate input databases. Try importing a new
                database
              </h3>
              {error !== null && (
                <details>
                  <pre>{error}</pre>
                </details>
              )}
            </div>
            <Button onClick={checkDBPathValidity}>Try Again</Button>
          </div>
        )}
      </div>
      <div className="cea-database-editor-footer"></div>
    </div>
  );
};

const DatabaseContent = () => {
  const { status, error } = useDatabaseEditorStore((state) => state.status);
  const initDatabaseState = useDatabaseEditorStore(
    (state) => state.initDatabaseState,
  );
  const resetDatabaseState = useDatabaseEditorStore(
    (state) => state.resetDatabaseState,
  );

  useEffect(() => {
    initDatabaseState();

    // Reset Database state on unmount
    return () => {
      resetDatabaseState();
    };
  }, [initDatabaseState, resetDatabaseState]);

  if (status === 'fetching')
    return (
      <CenterSpinner
        indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
        tip="Reading Databases..."
      />
    );
  if (status === 'failed') return <AsyncError error={error} />;

  if (status !== 'success') return null;

  return (
    <>
      <DatabaseTopMenu />
      <DatabaseContainer />
    </>
  );
};

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
        Export Database
      </Button>
      <ExportDatabaseModal
        visible={modalVisible}
        setVisible={setModalVisible}
      />
    </>
  );
};

const SaveDatabaseButton = () => {
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

const DatabaseContainer = () => {
  const data = useDatabaseEditorStore((state) => state.data);
  const schema = useDatabaseEditorStore((state) => state.schema);
  const { category, name } = useDatabaseEditorStore((state) => state.menu);
  if (
    !Object.keys(data).includes(category) ||
    !Object.keys(data[category]).includes(name)
  )
    return <div>{`${category}-${name} database not found`}</div>;

  if (!schema?.[name])
    return <div>{`Schema for database ${category}-${name} was not found`}</div>;

  return (
    <div className="cea-database-editor-database-container">
      <div className="cea-database-editor-database">
        <h2>{name.replace('_', '-')}</h2>
        <ValidationErrors databaseName={name} />
        {name === 'USE_TYPES' ? (
          <UseTypesDatabase
            name={name}
            data={data[category][name]}
            schema={schema[name]}
          />
        ) : (
          <Database
            name={name}
            data={data[category][name]}
            schema={schema[name]}
          />
        )}
      </div>
      <SaveDatabaseButton />
    </div>
  );
};

export default withErrorBoundary(DatabaseEditor);

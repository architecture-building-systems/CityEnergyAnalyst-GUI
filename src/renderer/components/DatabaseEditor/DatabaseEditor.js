import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { Icon, Button } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import CenterSpinner from '../HomePage/CenterSpinner';
import ExportDatabaseModal from './ExportDatabaseModal';
import './DatabaseEditor.css';
import {
  resetDatabaseState,
  initDatabaseState,
  resetDatabaseChanges
} from '../../actions/databaseEditor';
import { AsyncError } from '../../utils';
import routes from '../../constants/routes';
import { useChangeRoute } from '../Project/Project';
import SavingDatabaseModal from './SavingDatabaseModal';
import DatabaseTopMenu from './DatabaseTopMenu';
import Database from './Database';
import UseTypesDatabase from './UseTypesDatabase';
import ValidationErrors from './ValidationErrors';

const useValidateDatabasePath = () => {
  const [valid, setValid] = useState(null);
  const [error, setError] = useState(null);

  const checkDBPathValidity = async () => {
    try {
      setValid(null);
      setError(null);
      const resp = await axios.get(
        'http://localhost:5050/api/inputs/databases/check'
      );
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
  const [valid, error, checkDBPathValidity] = useValidateDatabasePath();
  const goToScript = useChangeRoute(`${routes.TOOLS}/data-initializer`);

  if (valid === null)
    return (
      <CenterSpinner
        indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
        tip="Verifying Databases..."
      />
    );

  return (
    <div className="cea-database-editor">
      <div className="cea-database-editor-header">
        <h2>Database Editor</h2>
        <div>
          <ExportDatabaseButton />
          <Button type="primary" icon="import" onClick={goToScript}>
            Import Database
          </Button>
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
  const { status, error } = useSelector(state => state.databaseEditor.status);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(initDatabaseState());

    // Reset Database state on unmount
    return () => {
      dispatch(resetDatabaseState());
    };
  }, []);

  if (status === 'fetching')
    return (
      <CenterSpinner
        indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
        tip="Reading Databases..."
      />
    );
  if (status === 'failed') return <AsyncError error={error} />;

  if (status !== 'success') return null;

  return (
    <React.Fragment>
      <DatabaseTopMenu />
      <DatabaseContainer />
    </React.Fragment>
  );
};

export const ExportDatabaseButton = () => {
  const { status } = useSelector(state => state.databaseEditor.status);
  const databaseValidation = useSelector(
    state => state.databaseEditor.validation
  );
  const [modalVisible, setModalVisible] = useState(false);

  if (status !== 'success') return null;

  return (
    <React.Fragment>
      <Button
        icon="upload"
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
    </React.Fragment>
  );
};

const SaveDatabaseButton = () => {
  const databasesData = useSelector(state => state.databaseEditor.data);
  const databaseValidation = useSelector(
    state => state.databaseEditor.validation
  );
  const databaseChanges = useSelector(state => state.databaseEditor.changes);
  const dispatch = useDispatch();
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const hideModal = () => {
    setModalVisible(false);
    setSuccess(null);
    setError(null);
  };

  const saveDB = async () => {
    setModalVisible(true);
    try {
      console.log(databasesData);
      const resp = await axios.put(
        'http://localhost:5050/api/inputs/databases',
        databasesData
      );
      setSuccess(true);
      dispatch(resetDatabaseChanges());
    } catch (err) {
      console.log(err.response);
      setError(err.response);
    }
  };
  return (
    <React.Fragment>
      <Button
        // Disable button if there are validation errors or if there are no changes to data
        disabled={
          !!Object.keys(databaseValidation).length || !databaseChanges.length
        }
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
    </React.Fragment>
  );
};

const DatabaseContainer = () => {
  const data = useSelector(state => state.databaseEditor.data);
  const schema = useSelector(state => state.databaseEditor.schema);
  const { category, name } = useSelector(state => state.databaseEditor.menu);
  if (
    !Object.keys(data).includes(category) ||
    !Object.keys(data[category]).includes(name)
  )
    return <div>{`${category}-${name} database not found`}</div>;

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

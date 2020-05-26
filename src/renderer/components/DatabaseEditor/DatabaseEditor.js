import React, { useState, useEffect, useReducer, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import axios from 'axios';
import { Icon, Button } from 'antd';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import CenterSpinner from '../HomePage/CenterSpinner';
import ExportDatabaseModal from './ExportDatabaseModal';
import './DatabaseEditor.css';
import {
  resetDatabaseState,
  initDatabaseState,
  initDatabaseFailure,
  initDatabaseSuccess,
  setActiveDatabase
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
    setValid(null);
    try {
      const resp = await axios.get(
        'http://localhost:5050/api/inputs/databases/check'
      );
      setValid(true);
    } catch (err) {
      if (err.response) setError(err.response.data.message);
      else setError('Could not read and verify databases.');
    }
  };

  useEffect(() => {
    checkDBPathValidity();
  }, []);

  useEffect(() => {
    if (valid === null) setError(null);
  }, [valid]);

  useEffect(() => {
    if (error !== null) setValid(false);
  }, [error]);

  return [valid, error, checkDBPathValidity];
};

const useInitDatabaseEditor = () => {
  const [databaseCategories, setCategories] = useState({});
  const cancelTokenRef = useRef(axios.CancelToken.source());
  const isMountedRef = useRef(true);
  const dispatch = useDispatch();

  const fetchInitDatabases = async () => {
    // eslint-disable-next-line
    const values = await Promise.all([
      axios.get('http://localhost:5050/api/inputs/databases/all', {
        cancelToken: cancelTokenRef.current.token
      }),
      axios.get('http://localhost:5050/api/databases/schema/all', {
        cancelToken: cancelTokenRef.current.token
      }),
      axios.get(`http://localhost:5050/api/glossary`, {
        cancelToken: cancelTokenRef.current.token
      })
    ]);
    return {
      data: values[0].data,
      schema: values[1].data,
      glossary: values[2].data
    };
  };

  const getDatabaseStructure = data => {
    let out = {};
    for (const category in data) {
      out[category] = Object.keys(data[category]);
    }
    return out;
  };

  const initDatabaseEditor = async () => {
    dispatch(initDatabaseState());
    try {
      const values = await fetchInitDatabases();
      console.log(values);
      setCategories(getDatabaseStructure(values.data));
      dispatch(initDatabaseSuccess(values));
    } catch (error) {
      // Ignore axios cancel error
      if (!axios.isCancel(error)) {
        dispatch(initDatabaseFailure(error));
      }
    }
  };

  useEffect(() => {
    initDatabaseEditor();
    return () => {
      isMountedRef.current = false;
      cancelTokenRef.current.cancel();
      dispatch(resetDatabaseState());
    };
  }, []);

  return { initDatabaseEditor, databaseCategories };
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
          <Button type="primary" onClick={goToScript}>
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
              <p>
                Could not find or validate databases. Try refreshing or
                importing a new database
              </p>
              {error !== null && <details>{error}</details>}
            </div>
            <Button onClick={checkDBPathValidity} icon="sync">
              Refresh
            </Button>
          </div>
        )}
      </div>
      <div className="cea-database-editor-footer"></div>
    </div>
  );
};

const DatabaseContent = () => {
  const { databaseCategories } = useInitDatabaseEditor();
  const { status, error } = useSelector(state => state.databaseEditor.status);
  const dispatch = useDispatch();

  const onCategoryChange = (category, name) =>
    dispatch(setActiveDatabase(category, name));

  if (status === 'fetching')
    return (
      <CenterSpinner
        indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />}
        tip="Reading Databases..."
      />
    );
  if (status === 'failed') return <AsyncError error={error} />;

  if (Object.keys(databaseCategories).length < 1) return null;

  return (
    <React.Fragment>
      <DatabaseTopMenu
        databaseCategories={databaseCategories}
        onChange={onCategoryChange}
      />
      <DatabaseContainer databaseCategories={databaseCategories} />
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
  const store = useStore();
  const validationLength = useSelector(
    state => Object.keys(state.databaseEditor.validation).length
  );
  const changesLength = useSelector(
    state => state.databaseEditor.changes.present.length
  );
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
      const databasesData = store.getState().databaseEditor.data.present;
      console.log(databasesData);
      const resp = await axios.put(
        'http://localhost:5050/api/inputs/databases',
        databasesData
      );
      setSuccess(true);
    } catch (err) {
      console.log(err.response);
      setError(err.response);
    }
  };
  return (
    <React.Fragment>
      <Button
        // Disable button if there are validation errors or if there are no changes to data
        disabled={validationLength > 0 || changesLength === 0}
        onClick={saveDB}
      >
        Save Databases
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

const DatabaseContainer = ({ databaseCategories }) => {
  const { category, name } = useSelector(state => state.databaseEditor.menu);
  const schema = useSelector(state => state.databaseEditor.schema);
  const glossary = useSelector(state => state.databaseEditor.glossary);
  const filteredGlossary = React.useMemo(
    () => glossary.find(script => script.script === 'inputs').variables,
    [glossary]
  );

  if (
    !Object.keys(databaseCategories).includes(category) ||
    !databaseCategories[category].includes(name)
  )
    return <div>{`${category}-${name} database not found`}</div>;

  return (
    <div className="cea-database-editor-database-container">
      <div className="cea-database-editor-database">
        <h2>{name.replace('_', '-')}</h2>
        <ValidationErrors databaseName={name} />
        {name === 'USE_TYPES' ? (
          <UseTypesDatabase
            category={category}
            name={name}
            schema={schema}
            glossary={filteredGlossary}
          />
        ) : (
          <Database
            category={category}
            name={name}
            schema={schema}
            glossary={filteredGlossary}
          />
        )}
      </div>
      <SaveDatabaseButton />
    </div>
  );
};

export default withErrorBoundary(DatabaseEditor);

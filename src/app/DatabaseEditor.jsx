import { useState, useEffect, useCallback } from 'react';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import CenterSpinner from 'components/CenterSpinner';
import ExportDatabaseModal from 'features/database-editor/components/DatabaseEditor/ExportDatabaseModal';
import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { AsyncError } from 'components/AsyncError';
import SavingDatabaseModal from 'features/database-editor/components/DatabaseEditor/SavingDatabaseModal';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';

import './DatabaseEditor.css';
import { CodeDataset } from 'features/database-editor/components/code-dataset';
import { ConversionDataset } from 'features/database-editor/components/conversion-dataset';
import { LibraryDataset } from 'features/database-editor/components/library-dataset';
import { UseTypeDataset } from 'features/database-editor/components/use-type-dataset';

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
      if (err.response?.data) setError(err.response.data.detail);
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
          <RefreshDatabaseButton />
        </div>
      </div>
      <div className="cea-database-editor-content">
        {valid ? (
          <DatabaseContent />
        ) : (
          <div>
            <div className="cea-database-editor-error-container">
              <h3>
                Could not find or validate input databases. Try importing a new
                database
              </h3>
              {error !== null && (
                <div
                  style={{
                    background: '#efefef',
                    padding: 16,
                    borderRadius: 8,
                  }}
                >
                  <pre>{error}</pre>
                </div>
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

const RefreshDatabaseButton = () => {
  const { status } = useDatabaseEditorStore((state) => state.status);
  const initDatabaseState = useDatabaseEditorStore(
    (state) => state.initDatabaseState,
  );

  if (status === 'fetching') return null;

  return (
    <Button
      onClick={() => {
        initDatabaseState();
      }}
    >
      Refresh
    </Button>
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
      {/* <DatabaseTopMenu /> */}
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
        Export
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

const DOMAINS = ['ARCHETYPES', 'ASSEMBLIES', 'COMPONENTS'];
const USE_TYPES_DATABASE = 'ARCHETYPES-USE';
const CONVERSION_DATABASE = 'COMPONENTS-CONVERSION';
const LIBRARY_DATABASE = '_LIBRARY';

const arraysEqual = (a, b) =>
  a.length === b.length && a.every((val, i) => val === b[i]);

const DatabaseContainer = () => {
  // Database structure:
  // Level 1: REGION (CH, DE, SG)
  // Level 2: DOMAIN (ARCHETYPES, ASSEMBLIES, COMPONENTS)
  // Level 3: CATEGORY (CONSTRUCTION, USE, ENVELOPE, HVAC, CONVERSION)
  // Level 4: SUBCATEGORY (SCHEDULES, FEEDSTOCKS_LIBRARY, etc.)
  // Level 5: DATASET (CONSTRUCTION_TYPES.csv, BOILERS.csv, etc.)

  const data = useDatabaseEditorStore((state) => state.data);
  const [selectedDomain, setSelectedDomain] = useState({
    domain: null,
    category: null,
  });
  const [selectedDataset, setSelectedDataset] = useState(null);

  const onDomainSelect = useCallback((domain) => {
    setSelectedDomain(domain);
    setSelectedDataset(null);
  }, []);

  // FIXME: Backend does not return schema for database
  // if (!schema?.[name])
  //   return <div>{`Schema for database ${category}-${name} was not found`}</div>;

  const domains = Object.keys(data ?? {}).map((name) => name.toUpperCase());
  if (domains.length === 0) return <div>No data</div>;

  // Ensure first level keys of data are DOMAINS
  if (!arraysEqual(domains, DOMAINS)) return <div>Invalid data</div>;

  const domainCategory = `${(selectedDomain.domain ?? '').toUpperCase()}-${(selectedDomain.category ?? '').toUpperCase()}`;
  const categoryData = data?.[selectedDomain.domain]?.[selectedDomain.category];
  const categoryDatasets = Object.keys(categoryData ?? {});
  const dataset = categoryData?.[selectedDataset];
  console.log(selectedDomain, selectedDataset);

  return (
    <ErrorBoundary>
      <div className="cea-database-editor-database-container">
        <div className="cea-database-editor-database-domain-categories">
          {Object.keys(data).map((name) => (
            <DatabaseDomainCategories
              key={name}
              name={name}
              categories={Object.keys(data[name])}
              active={selectedDomain}
              onSelect={onDomainSelect}
            />
          ))}
        </div>

        {/* UseTypeDataset is a special case */}
        {domainCategory == USE_TYPES_DATABASE && (
          <UseTypeDataset dataset={categoryData} />
        )}

        {domainCategory != USE_TYPES_DATABASE && (
          <ErrorBoundary>
            <div className="cea-database-editor-database-dataset-buttons">
              {categoryDatasets.map((dataset) => (
                <Button
                  key={dataset}
                  onClick={() => setSelectedDataset(dataset)}
                  type={selectedDataset == dataset ? 'primary' : 'default'}
                >
                  {dataset.toUpperCase().split('_').join(' ')}
                </Button>
              ))}
            </div>
            <div className="cea-database-editor-database-dataset">
              <ErrorBoundary>
                {(() => {
                  switch (domainCategory) {
                    case CONVERSION_DATABASE:
                      return <ConversionDataset data={dataset} />;
                    default:
                      if (
                        (selectedDataset ?? '').toUpperCase() ==
                        LIBRARY_DATABASE
                      )
                        return <LibraryDataset data={dataset} />;

                      return <CodeDataset data={dataset} />;
                  }
                })()}
              </ErrorBoundary>
            </div>
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
};

const DatabaseDomainCategories = ({ name, categories, active, onSelect }) => {
  return (
    <div className="cea-database-editor-database-domain-category">
      {categories.map((category) => (
        <Button
          key={`${name}-${category}`}
          onClick={() => onSelect?.({ domain: name, category })}
          type={
            active?.domain == name && active?.category == category
              ? 'primary'
              : 'default'
          }
        >
          <div>
            <b>{name.toUpperCase()}</b>
            {category}
          </div>
        </Button>
      ))}
    </div>
  );
};

export default DatabaseEditor;

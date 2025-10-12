import { useState, useEffect, useCallback } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';
import CenterSpinner from 'components/CenterSpinner';
import useDatabaseEditorStore, {
  FETCHING_STATUS,
  FAILED_STATUS,
  SAVING_STATUS,
} from 'features/database-editor/stores/databaseEditorStore';
import { AsyncError } from 'components/AsyncError';
import { useProjectStore } from 'features/project/stores/projectStore';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';

import './DatabaseEditor.css';
import {
  ConversionDataset,
  LibraryDataset,
  UseTypeDataset,
  CodeTableDataset,
} from 'features/database-editor/components/dataset';
import { RefreshDatabaseButton } from 'features/database-editor/components/refresh-button';
import { ExportDatabaseButton } from 'features/database-editor/components/export-button';
import { ImportDatabaseButton } from 'features/database-editor/components/import-button';
import { arraysEqual } from 'utils';
import { DatabaseChangesList } from 'features/database-editor/components/changes-list';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';
import LoginModal from 'features/auth/components/Login/LoginModal';
import { isElectron } from 'utils/electron';

const DatabaseEditorErrorMessage = ({ error }) => {
  return (
    <div className="cea-database-editor-error-container">
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
  );
};

const DatabaseEditor = () => {
  const scenarioName = useProjectStore((state) => state.scenario);
  const isEmpty = useDatabaseEditorStore((state) => state.isEmpty);
  const databaseValidation = useDatabaseEditorStore(
    (state) => state.databaseValidation,
  );
  const validateDatabase = useDatabaseEditorStore(
    (state) => state.validateDatabase,
  );

  if (scenarioName === null) return <div>No scenario selected.</div>;
  if (databaseValidation.status === 'checking')
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Only show import/export buttons in browser */}
          {!isElectron() && !isEmpty && (
            <>
              <ImportDatabaseButton />
              <ExportDatabaseButton />
            </>
          )}
          <RefreshDatabaseButton onRefresh={validateDatabase} />
        </div>
      </div>
      <DatabaseContent message={databaseValidation.message} />
      <div className="cea-database-editor-footer"></div>
    </div>
  );
};

const DatabaseContent = ({ message }) => {
  const { status, error } = useDatabaseEditorStore((state) => state.status);
  const initDatabaseState = useDatabaseEditorStore(
    (state) => state.initDatabaseState,
  );
  const fetchDatabaseSchema = useDatabaseEditorStore(
    (state) => state.fetchDatabaseSchema,
  );
  const resetDatabaseState = useDatabaseEditorStore(
    (state) => state.resetDatabaseState,
  );
  const validateDatabase = useDatabaseEditorStore(
    (state) => state.validateDatabase,
  );

  const saveDatabaseState = useDatabaseEditorStore(
    (state) => state.saveDatabaseState,
  );
  const setShowLoginModal = useSetShowLoginModal();

  const changes = useDatabaseEditorStore((state) => state.changes);
  const handleSave = async () => {
    if (status === SAVING_STATUS) return;
    try {
      await saveDatabaseState();
    } catch (error) {
      if (error.response.status === 401) setShowLoginModal(true);
    }
  };

  useEffect(() => {
    const init = async () => {
      await initDatabaseState();
      await fetchDatabaseSchema();
      await validateDatabase();
    };

    init();
    // Reset Database state on unmount
    return () => {
      resetDatabaseState();
    };
  }, [
    initDatabaseState,
    fetchDatabaseSchema,
    validateDatabase,
    resetDatabaseState,
  ]);

  if (status === FETCHING_STATUS)
    return (
      <CenterSpinner
        indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
        tip="Reading Databases..."
      />
    );
  if (status === FAILED_STATUS) return <AsyncError error={error} />;

  return (
    <Spin
      tip="Saving Databases..."
      spinning={status === SAVING_STATUS}
      indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
    >
      <div className="cea-database-editor-content">
        {/* <DatabaseTopMenu /> */}
        {message && <DatabaseEditorErrorMessage error={message} />}
        <DatabaseChangesList changes={changes} onSave={handleSave} />
        <DatabaseContainer />
      </div>
      <LoginModal />
    </Spin>
  );
};

const DOMAINS = ['ARCHETYPES', 'ASSEMBLIES', 'COMPONENTS'];
const USE_TYPES_DATABASE = ['ARCHETYPES', 'USE'];
const CONVERSION_DATABASE = ['COMPONENTS', 'CONVERSION'];
const LIBRARY_DATABASE = '_LIBRARY';

const EmptyDatabaseState = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '48px',
        textAlign: 'center',
      }}
    >
      <h2 style={{ marginBottom: '8px' }}>No Database Found</h2>
      <p style={{ color: '#666', marginBottom: '24px', maxWidth: '500px' }}>
        Upload a database file to get started.
      </p>
      {!isElectron() && <ImportDatabaseButton />}
    </div>
  );
};

const DatabaseContainer = () => {
  // Database structure:
  // Level 1: REGION (CH, DE, SG)
  // Level 2: DOMAIN (ARCHETYPES, ASSEMBLIES, COMPONENTS)
  // Level 3: CATEGORY (CONSTRUCTION, USE, ENVELOPE, HVAC, CONVERSION)
  // Level 4: SUBCATEGORY (SCHEDULES, FEEDSTOCKS_LIBRARY, etc.)
  // Level 5: DATASET (CONSTRUCTION_TYPES.csv, BOILERS.csv, etc.)

  const data = useDatabaseEditorStore((state) => state.data);
  const isEmpty = useDatabaseEditorStore((state) => state.isEmpty);
  // TODO: Move state to url query params
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

  // Show empty state if database is empty
  if (isEmpty || domains.length === 0) return <EmptyDatabaseState />;

  // Ensure first level keys of data are DOMAINS
  if (!arraysEqual(domains, DOMAINS)) return <div>Invalid data</div>;

  const domainCategory =
    selectedDomain.domain && selectedDomain.category
      ? [
          selectedDomain.domain.toUpperCase(),
          selectedDomain.category.toUpperCase(),
        ]
      : null;
  const categoryData = data?.[selectedDomain.domain]?.[selectedDomain.category];
  const categoryDatasets = Object.keys(categoryData ?? {});

  // Set first dataset if none is selected
  const activeDataset = selectedDataset ?? categoryDatasets?.[0];
  const dataset = categoryData?.[activeDataset];

  return (
    <ErrorBoundary>
      <div className="cea-database-editor-database-container">
        <div className="cea-database-editor-database-domain-categories">
          {Object.keys(data).map((name) => (
            <DatabaseDomainCategory
              key={name}
              name={name}
              categories={Object.keys(data[name])}
              active={selectedDomain}
              onSelect={onDomainSelect}
            />
          ))}
        </div>

        {/* UseTypeDataset is a special case that does not have a dataset button */}
        {!arraysEqual(domainCategory, USE_TYPES_DATABASE) && (
          <div className="cea-database-editor-database-dataset-buttons">
            {domainCategory &&
              categoryDatasets.map((dataset) => (
                <Button
                  key={`${domainCategory}-${dataset}`}
                  onClick={() => setSelectedDataset(dataset)}
                  type={activeDataset == dataset ? 'primary' : 'default'}
                >
                  {dataset.toUpperCase().split('_').join(' ')}
                </Button>
              ))}
          </div>
        )}

        <ErrorBoundary>
          <div className="cea-database-editor-database-dataset">
            <ErrorBoundary>
              {(() => {
                if (domainCategory == null)
                  // TODO: Add quick start guide / documentation link
                  return <div>Select a domain and category to begin.</div>;

                if (arraysEqual(domainCategory, USE_TYPES_DATABASE)) {
                  return (
                    <UseTypeDataset
                      dataKey={domainCategory}
                      dataset={categoryData}
                    />
                  );
                }

                const dataKey = [...domainCategory, activeDataset];

                if (arraysEqual(domainCategory, CONVERSION_DATABASE)) {
                  return <ConversionDataset dataKey={dataKey} data={dataset} />;
                }

                if ((activeDataset ?? '').toUpperCase() === LIBRARY_DATABASE) {
                  return <LibraryDataset dataKey={dataKey} data={dataset} />;
                }

                return <CodeTableDataset dataKey={dataKey} data={dataset} />;
              })()}
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

const DatabaseDomainCategory = ({ name, categories, active, onSelect }) => {
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
            <span>{category}</span>
          </div>
        </Button>
      ))}
    </div>
  );
};

export default DatabaseEditor;

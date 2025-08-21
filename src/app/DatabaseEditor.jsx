import { useState, useEffect, useCallback } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import CenterSpinner from 'components/CenterSpinner';
import useDatabaseEditorStore from 'features/database-editor/stores/databaseEditorStore';
import { AsyncError } from 'components/AsyncError';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';

import './DatabaseEditor.css';
import {
  ConversionDataset,
  LibraryDataset,
  UseTypeDataset,
  CodeTableDataset,
} from 'features/database-editor/components/dataset';
import { RefreshDatabaseButton } from 'features/database-editor/components/refresh-button';

const useValidateDatabasePath = () => {
  const [valid, setValid] = useState({ message: null, status: null });

  const checkDBPathValidity = async () => {
    try {
      setValid({ message: null, status: 'checking' });
      await apiClient.get(`/api/inputs/databases/check`);
      setValid({ message: null, status: 'valid' });
    } catch (err) {
      console.log(err);
      if (err.response?.status == 400 && err.response?.data) {
        const { status, message } = err.response.data.detail;
        setValid({ message, status });
      } else {
        setValid({
          message: 'Could not read and verify databases.',
          status: 'invalid',
        });
      }
    }
  };

  useEffect(() => {
    checkDBPathValidity();
  }, []);

  return [valid?.status, valid?.message, checkDBPathValidity];
};

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

  const [status, message] = useValidateDatabasePath();

  if (scenarioName === null) return <div>No scenario selected.</div>;
  if (status === 'checking')
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
          {/* <ExportDatabaseButton /> */}
          <RefreshDatabaseButton />
        </div>
      </div>
      <DatabaseContent message={message} />
      <div className="cea-database-editor-footer"></div>
    </div>
  );
};

const DatabaseContent = ({ message }) => {
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
    <div className="cea-database-editor-content">
      {/* <DatabaseTopMenu /> */}
      {message && <DatabaseEditorErrorMessage error={message} />}
      <DatabaseContainer />
    </div>
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
  if (domains.length === 0) return <div>No data</div>;

  // Ensure first level keys of data are DOMAINS
  if (!arraysEqual(domains, DOMAINS)) return <div>Invalid data</div>;

  const domainCategory = `${(selectedDomain.domain ?? '').toUpperCase()}-${(selectedDomain.category ?? '').toUpperCase()}`;
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

        {/* UseTypeDataset is a special case */}
        {domainCategory == USE_TYPES_DATABASE && (
          <UseTypeDataset dataset={categoryData} />
        )}

        {domainCategory != USE_TYPES_DATABASE && (
          <ErrorBoundary>
            <div className="cea-database-editor-database-dataset-buttons">
              {categoryDatasets.map((dataset) => (
                <Button
                  key={`${domainCategory}-${dataset}`}
                  onClick={() => setSelectedDataset(dataset)}
                  type={activeDataset == dataset ? 'primary' : 'default'}
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
                        (activeDataset ?? '').toUpperCase() == LIBRARY_DATABASE
                      )
                        return <LibraryDataset data={dataset} />;
                      return (
                        <CodeTableDataset
                          key={`${domainCategory}-${activeDataset}`}
                          data={dataset}
                        />
                      );
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

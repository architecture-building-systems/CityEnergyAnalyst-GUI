import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingOutlined } from '@ant-design/icons';
import { Alert, Button, Spin, message as antdMessage } from 'antd';
import CenterSpinner from 'components/CenterSpinner';
import useDatabaseEditorStore, {
  FETCHING_STATUS,
  SAVING_STATUS,
  useDatabaseSelection,
  useDatabaseLoadError,
  DerivedConflictError,
} from 'features/database-editor/stores/databaseEditorStore';
import { DerivedConflictModal } from 'features/database-editor/components/derived-conflict-modal';
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
import ErrorModal from 'components/ErrorModal';
import { useDemoMode } from 'stores/demoStore';

const DatabaseEditorErrorMessage = ({ error }) => {
  return (
    <div className="cea-database-editor-error-container">
      {error !== null && (
        <div
          style={{
            background: '#efefef',
            padding: 16,
            borderRadius: 8,
            overflowX: 'auto',
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
  const demoMode = useDemoMode();
  const isEmpty = useDatabaseEditorStore((state) => state.isEmpty);
  const databaseValidation = useDatabaseEditorStore(
    (state) => state.databaseValidation,
  );

  const initDatabaseState = useDatabaseEditorStore(
    (state) => state.initDatabaseState,
  );
  const fetchDatabaseSchema = useDatabaseEditorStore(
    (state) => state.fetchDatabaseSchema,
  );
  const resetDatabaseState = useDatabaseEditorStore(
    (state) => state.resetDatabaseState,
  );

  useEffect(() => {
    const init = async () => {
      await initDatabaseState();
      await fetchDatabaseSchema();
    };

    init();
    // Reset Database state on unmount
    return () => {
      resetDatabaseState();
    };
  }, []);

  if (scenarioName === null) return <div>No scenario selected.</div>;

  const isValidating = databaseValidation.status === 'checking';

  return (
    <div className="cea-database-editor">
      <div className="cea-database-editor-header">
        <h2>Database Editor</h2>
        {/* Demo scenarios are a fixed, read-only allowlist - there's
        nothing to import, export, or refresh, so show a notice in place
        of those actions instead of just leaving an empty gap. */}
        {demoMode ? (
          <Alert type="info" showIcon message="Read-only demo scenario" />
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Only show import/export buttons in browser. */}
            {!isElectron() && !isEmpty && !isValidating && (
              <>
                <ImportDatabaseButton />
                <ExportDatabaseButton />
              </>
            )}
            <RefreshDatabaseButton isLoading={isValidating} />
          </div>
        )}
      </div>
      {isValidating ? (
        <CenterSpinner
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
          tip="Verifying Databases..."
        />
      ) : (
        <DatabaseContent message={databaseValidation.message} />
      )}
      <div className="cea-database-editor-footer"></div>
    </div>
  );
};

const DatabaseContent = ({ message }) => {
  const { status } = useDatabaseEditorStore((state) => state.status);
  const saveDatabaseState = useDatabaseEditorStore(
    (state) => state.saveDatabaseState,
  );
  const setShowLoginModal = useSetShowLoginModal();
  const [saveError, setSaveError] = useState(null);
  const queryClient = useQueryClient();

  const changes = useDatabaseEditorStore((state) => state.changes);
  // Discard = reload from disk. It clears `changes` as part of the fetch, and unlike
  // `initDatabaseState` it keeps the user on the dataset they were editing.
  const refreshDatabaseData = useDatabaseEditorStore(
    (state) => state.refreshDatabaseData,
  );
  const [derivedConflicts, setDerivedConflicts] = useState(null);

  const handleSave = async (options) => {
    if (status === SAVING_STATUS) return;
    try {
      await saveDatabaseState(options);
      setDerivedConflicts(null);

      // The archetype-lock drift check (`useArchetypeDrift`) compares the live construction-type
      // database against every building's current envelope/hvac/supply row -- stale data here
      // would show a building as drifted (or not) against a database that no longer exists.
      // Unconditional, not gated on `lastRemap`: an edit to a `const_type` no building currently
      // uses still changes what a *future* selection of it would mean, and this table has no
      // other invalidation path (it is its own query key, separate from the Database Editor's
      // Zustand store).
      queryClient.invalidateQueries({ queryKey: ['inputs-databases'] });

      // While the scenario is locked, a save that touched an archetype the mapper reads
      // re-runs it for the buildings that reference it (see `saveDatabaseState`). Read the
      // fresh value directly rather than through the hook's selector, which will not have
      // re-rendered yet at this point in the same tick.
      const { lastRemap } = useDatabaseEditorStore.getState();
      if (lastRemap?.buildings?.length) {
        const count = lastRemap.buildings.length;
        antdMessage.info(
          `Re-mapped ${count} building${count === 1 ? '' : 's'} to the updated archetypes.`,
        );
        // The derived tables on disk just changed, and the lock's `mapped_at` advanced --
        // both cached by the input editor under these keys (see `useArchetypeLock.js`, which
        // invalidates the same two on a re-lock for the same reason).
        queryClient.invalidateQueries({ queryKey: ['inputs'] });
        queryClient.invalidateQueries({ queryKey: ['archetype-lock'] });
      } else if (lastRemap?.error) {
        antdMessage.warning(
          `The database was saved, but re-mapping the affected buildings failed: ${lastRemap.error}`,
        );
      }
    } catch (error) {
      if (error instanceof DerivedConflictError)
        setDerivedConflicts(error.conflicts);
      else if (error?.response?.status === 401) setShowLoginModal(true);
      else setSaveError(error);
    }
  };

  if (status === FETCHING_STATUS)
    return (
      <CenterSpinner
        indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
        tip="Loading Databases..."
      />
    );

  return (
    <Spin
      tip="Saving Databases..."
      spinning={status === SAVING_STATUS}
      indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
    >
      <div className="cea-database-editor-content">
        {/* <DatabaseTopMenu /> */}
        {message && <DatabaseEditorErrorMessage error={message} />}
        <DatabaseChangesList
          changes={changes}
          onSave={() => handleSave()}
          onDiscard={() => refreshDatabaseData()}
        />
        <DatabaseContainer />
      </div>
      <LoginModal />
      <DerivedConflictModal
        conflicts={derivedConflicts}
        onConfirm={() => handleSave({ overwriteDerived: true })}
        onCancel={() => setDerivedConflicts(null)}
      />
      <ErrorModal
        open={saveError != null}
        title="Error Saving Database"
        message={
          <div>
            An error occurred while saving the database. <br /> Ensure that
            there are no validation errors and try again.
          </div>
        }
        error={saveError}
        onClose={() => setSaveError(null)}
      />
    </Spin>
  );
};

const DOMAINS = ['ARCHETYPES', 'ASSEMBLIES', 'COMPONENTS'];
const USE_TYPES_DATABASE = ['ARCHETYPES', 'USE'];
const CONVERSION_DATABASE = ['COMPONENTS', 'CONVERSION'];
const LIBRARY_DATABASE = '_LIBRARY';

const NoTablesPanel = ({ title, children }) => (
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
    <h2 style={{ marginBottom: '8px' }}>{title}</h2>
    {children}
  </div>
);

/** Shown when the database exists but could not be read. The reason is in the message area
 * above; this only explains why there are no tables, and offers a retry. */
const UnreadableDatabaseState = () => (
  <NoTablesPanel title="Database could not be read">
    <p style={{ color: '#666', marginBottom: '24px', maxWidth: '600px' }}>
      See the message above for the problem. Correct it in the database files,
      then refresh.
    </p>
    <RefreshDatabaseButton />
  </NoTablesPanel>
);

const EmptyDatabaseState = () => (
  <NoTablesPanel title="No Database Found">
    <p style={{ color: '#666', marginBottom: '24px', maxWidth: '500px' }}>
      Upload a database file to get started.
    </p>
    {!isElectron() && <ImportDatabaseButton />}
  </NoTablesPanel>
);

const DatabaseContainer = () => {
  // Database structure:
  // Level 1: REGION (CH, DE, SG)
  // Level 2: DOMAIN (ARCHETYPES, ASSEMBLIES, COMPONENTS)
  // Level 3: CATEGORY (CONSTRUCTION, USE, ENVELOPE, HVAC, CONVERSION)
  // Level 4: SUBCATEGORY (SCHEDULES, FEEDSTOCKS_LIBRARY, etc.)
  // Level 5: DATASET (CONSTRUCTION_TYPES.csv, BOILERS.csv, etc.)

  const data = useDatabaseEditorStore((state) => state.data);
  const isEmpty = useDatabaseEditorStore((state) => state.isEmpty);
  const loadError = useDatabaseLoadError();
  // TODO: Move state to url query params
  const selection = useDatabaseSelection();
  const onDomainSelect = useDatabaseEditorStore((state) => state.setSelection);
  const setSelectedDataset = useDatabaseEditorStore(
    (state) => state.setSelectedDataset,
  );

  // FIXME: Backend does not return schema for database
  // if (!schema?.[name])
  //   return <div>{`Schema for database ${category}-${name} was not found`}</div>;

  const domains = Object.keys(data ?? {}).map((name) => name.toUpperCase());

  // Only stand in for the tables when there are none: a partial failure (the schema, say)
  // still leaves an editable database, and the message area already carries the reason.
  if (domains.length === 0)
    // A failed read is not an empty database -- "upload one to get started" would send the
    // user off to fix the wrong thing.
    return loadError ? <UnreadableDatabaseState /> : <EmptyDatabaseState />;

  if (isEmpty) return <EmptyDatabaseState />;

  // Ensure first level keys of data are DOMAINS
  if (!arraysEqual(domains, DOMAINS)) return <div>Invalid data</div>;

  const domainCategory =
    selection.domain && selection.category
      ? [selection.domain.toUpperCase(), selection.category.toUpperCase()]
      : null;
  const categoryData = data?.[selection.domain]?.[selection.category];
  const categoryDatasets = Object.keys(categoryData ?? {});

  // Set first dataset if none is selected
  const activeDataset = selection.dataset ?? categoryDatasets?.[0];
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
              active={selection}
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

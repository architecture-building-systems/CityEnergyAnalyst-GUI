import { useEffect, useMemo, useCallback } from 'react';
import {
  Select,
  Button,
  Typography,
  Empty,
  Space,
  Segmented,
  Card,
  Tooltip,
  Alert,
} from 'antd';
import { ClearOutlined } from '@ant-design/icons';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import {
  useFetchWhatifs,
  useFetchFeatures,
  useFetchScenarios,
} from '../hooks/useReportsData';
import WhatIfColumn from './WhatIfColumn';

const { Title } = Typography;

const FEATURE_LABELS = {
  demand: 'Building Energy Demand',
  'final-energy': 'Energy by Carrier',
  costs: 'Cost Breakdown',
  emissions: 'Operational Emissions',
  'heat-rejection': 'Anthropogenic Heat Rejection',
};

const ReportsPage = () => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const {
    mode,
    feature,
    columns,
    setMode,
    setFeature,
    addColumn,
    removeColumn,
    clearColumns,
    setColumns,
  } = useReportsStore();

  const {
    data: features = [],
    error: featuresError,
  } = useFetchFeatures();
  const {
    data: whatifs = [],
    isLoading: whatifsLoading,
    error: whatifsError,
  } = useFetchWhatifs(project, scenario);
  const { data: scenarios = [] } = useFetchScenarios(project);

  // Build feature options — fall back to hardcoded labels if API fails
  const featureOptions = useMemo(
    () =>
      features.length > 0
        ? features.map((f) => ({ label: f.label, value: f.key }))
        : Object.entries(FEATURE_LABELS).map(([k, v]) => ({
            label: v,
            value: k,
          })),
    [features],
  );

  // Auto-populate columns when what-ifs are loaded and columns are empty
  useEffect(() => {
    if (
      mode === 'intra' &&
      whatifs.length > 0 &&
      columns.length === 0 &&
      scenario
    ) {
      const initialColumns = whatifs.slice(0, 3).map((wn) => ({
        scenario,
        whatif: wn,
      }));
      setColumns(initialColumns);
    }
  }, [whatifs, mode, scenario]);

  // Available what-ifs not yet added
  const availableWhatifs = useMemo(() => {
    if (mode !== 'intra') return [];
    const used = new Set(columns.map((c) => c.whatif));
    return whatifs.filter((wn) => !used.has(wn));
  }, [whatifs, columns, mode]);

  // Available scenarios not yet added (inter mode)
  const availableScenarios = useMemo(() => {
    if (mode !== 'inter') return [];
    const used = new Set(columns.map((c) => c.scenario));
    return scenarios.filter((s) => !used.has(s));
  }, [scenarios, columns, mode]);

  const handleAddWhatif = useCallback(
    (whatif) => {
      if (scenario) addColumn({ scenario, whatif });
    },
    [scenario, addColumn],
  );

  const handleAddScenario = useCallback(
    (scenarioName) => {
      addColumn({ scenario: scenarioName, whatif: null });
    },
    [addColumn],
  );

  const handleModeChange = useCallback(
    (newMode) => {
      setMode(newMode);
      if (newMode === 'inter' && scenarios.length > 0) {
        const initialColumns = scenarios.slice(0, 3).map((s) => ({
          scenario: s,
          whatif: null,
        }));
        setColumns(initialColumns);
      }
    },
    [setMode, setColumns, scenarios],
  );

  if (!project || !scenario) {
    return (
      <div style={centredStyle}>
        <Empty description="Please select a project and scenario first." />
      </div>
    );
  }

  // Determine whether what-ifs have finished loading (or errored)
  const whatifsResolved = !whatifsLoading || whatifsError;
  const noWhatifs = whatifsResolved && whatifs.length === 0;
  const featureNeedsWhatif = feature !== 'demand';

  return (
    <div style={containerStyle}>
      {/* Header controls */}
      <div style={headerStyle}>
        <Title level={4} style={{ margin: 0 }}>
          Reports
        </Title>

        <Space wrap>
          <Segmented
            value={mode}
            onChange={handleModeChange}
            options={[
              { label: 'Compare What-Ifs', value: 'intra' },
              { label: 'Compare Scenarios', value: 'inter' },
            ]}
          />

          <Select
            value={feature}
            onChange={setFeature}
            options={featureOptions}
            style={{ minWidth: 200 }}
            placeholder="Select feature"
          />

          {mode === 'intra' && availableWhatifs.length > 0 && (
            <Select
              placeholder="Add a what-if"
              value={null}
              onChange={handleAddWhatif}
              options={availableWhatifs.map((wn) => ({
                label: wn,
                value: wn,
              }))}
              style={{ minWidth: 160 }}
              loading={whatifsLoading}
            />
          )}

          {mode === 'inter' && availableScenarios.length > 0 && (
            <Select
              placeholder="Add a scenario"
              value={null}
              onChange={handleAddScenario}
              options={availableScenarios.map((s) => ({
                label: s,
                value: s,
              }))}
              style={{ minWidth: 160 }}
            />
          )}

          {columns.length > 0 && (
            <Tooltip title="Clear all columns">
              <Button
                icon={<ClearOutlined />}
                onClick={clearColumns}
                size="small"
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* API connection error */}
      {whatifsError && (
        <Alert
          type="warning"
          showIcon
          message="Could not load what-if scenarios"
          description="Make sure the CEA backend is running and has been restarted with the latest version."
          style={{ marginBottom: 8 }}
        />
      )}

      {/* Intra mode: no what-ifs info */}
      {mode === 'intra' && noWhatifs && !whatifsError && (
        <Card style={{ marginBottom: 16 }}>
          <Empty
            description={
              featureNeedsWhatif
                ? 'No what-if analyses found. Run the Final Energy analysis first to create what-if scenarios.'
                : 'No what-if analyses found. You can still view demand results below.'
            }
          />
        </Card>
      )}

      {/* Demand without what-if — show single column */}
      {mode === 'intra' && feature === 'demand' && noWhatifs && scenario && (
        <div style={columnsContainerStyle}>
          <WhatIfColumn
            project={project}
            scenario={scenario}
            feature={feature}
            whatif={null}
          />
        </div>
      )}

      {/* Columns from store */}
      {columns.length > 0 && (
        <div style={columnsContainerStyle}>
          {columns.map((col, index) => (
            <WhatIfColumn
              key={`${col.scenario}-${col.whatif}-${index}`}
              project={project}
              scenario={col.scenario}
              feature={feature}
              whatif={col.whatif}
              onRemove={
                columns.length > 1 ? () => removeColumn(index) : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Inter mode with no scenarios */}
      {mode === 'inter' && columns.length === 0 && scenarios.length === 0 && (
        <Card>
          <Empty description="No scenarios found in this project." />
        </Card>
      )}
    </div>
  );
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
  background: '#fff',
  borderRadius: 8,
  padding: '12px 16px',
  border: '1px solid #eee',
};

const columnsContainerStyle = {
  display: 'flex',
  gap: 16,
  flexWrap: 'nowrap',
  overflowX: 'auto',
  paddingBottom: 16,
};

const centredStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
};

export default ReportsPage;

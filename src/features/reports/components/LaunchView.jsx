import { useState } from 'react';
import { Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import { useFetchWhatifs, useFetchScenarios } from '../hooks/useReportsData';
import ReportColumn from './ReportColumn';
import AddPlotButton from './AddPlotButton';
import ScenarioPicker from './ScenarioPicker';

/**
 * Launch view — entry point for Reports Mode.
 *
 * Layout (matching mockup):
 *   White card on the left (~30vw) with scenario column
 *   Blue action buttons float on the grey background to the right
 *   "Add a plot" sits below the card on the grey background
 */
const LaunchView = () => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const enterInterScenario = useReportsStore((s) => s.enterInterScenario);
  const enterInterWhatif = useReportsStore((s) => s.enterInterWhatif);
  const enterInterFeature = useReportsStore((s) => s.enterInterFeature);

  const { data: whatifs = [] } = useFetchWhatifs(project, scenario);
  const { data: scenarios = [] } = useFetchScenarios(project);

  const [pickerMode, setPickerMode] = useState(null);

  if (!project || !scenario) {
    return (
      <div style={centredStyle}>
        <Empty description="Please select a project and scenario first." />
      </div>
    );
  }

  const handleCompareScenarios = () => {
    if (scenarios.length <= 1) {
      enterInterScenario([scenario]);
    } else {
      setPickerMode('scenario');
    }
  };

  const handleCompareWhatifs = () => {
    if (whatifs.length === 0) {
      enterInterWhatif(scenario, []);
    } else if (whatifs.length <= 3) {
      enterInterWhatif(scenario, whatifs);
    } else {
      setPickerMode('whatif');
    }
  };

  const handleCompareFeatures = () => {
    enterInterFeature([
      { scenario, feature: 'demand', label: 'Building Energy Demand' },
    ]);
  };

  const handlePickerConfirm = (selected) => {
    if (pickerMode === 'scenario') {
      enterInterScenario(selected);
    } else if (pickerMode === 'whatif') {
      enterInterWhatif(scenario, selected);
    }
    setPickerMode(null);
  };

  const defaultSlots = [{ id: 'launch-default', feature: 'demand' }];

  return (
    <>
      <div style={layoutStyle}>
        {/* White card with scenario column */}
        <div style={cardStyle}>
          <ReportColumn
            columnDef={{ type: 'scenario', scenario }}
            plotSlots={defaultSlots}
          />
        </div>

        {/* Action buttons on grey background */}
        <div style={actionsStyle}>
          <ActionButton
            label="Compare Scenarios"
            onClick={handleCompareScenarios}
          />
          <ActionButton
            label="Compare What-ifs"
            onClick={handleCompareWhatifs}
          />
          <ActionButton
            label="Compare Feature Results"
            onClick={handleCompareFeatures}
          />
        </div>
      </div>

      {/* "Add a plot" below card, on grey background */}
      <div style={addPlotStyle}>
        <AddPlotButton label="Add a plot" onClick={() => {}} />
      </div>

      {/* Picker modal */}
      {pickerMode && (
        <ScenarioPicker
          open
          mode={pickerMode}
          project={project}
          scenario={scenario}
          scenarios={scenarios}
          whatifs={whatifs}
          onConfirm={handlePickerConfirm}
          onCancel={() => setPickerMode(null)}
        />
      )}
    </>
  );
};

const ActionButton = ({ label, onClick }) => {
  return (
    <button type="button" onClick={onClick} style={actionButtonStyle}>
      <span style={actionCircleStyle}>
        <PlusOutlined style={{ color: '#fff', fontSize: 18 }} />
      </span>
      <span style={actionLabelStyle}>{label}</span>
    </button>
  );
};

const layoutStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 32,
};

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
  width: '30vw',
  minWidth: 320,
  padding: '20px 24px',
  flexShrink: 0,
};

const actionsStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 24,
  paddingTop: 40,
};

const addPlotStyle = {
  marginTop: 12,
  paddingLeft: 4,
};

const centredStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 80,
  background: '#fff',
  borderRadius: 12,
};

const actionButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '10px 8px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 8,
  transition: 'background 0.15s',
};

const actionCircleStyle = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#1470AF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const actionLabelStyle = {
  fontSize: 16,
  fontWeight: 600,
  color: '#333',
};

export default LaunchView;

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
 * Layout (matching mockup 1):
 *   Left ~55%: Single column card showing active scenario with default demand plot
 *   Right ~45%: Three blue action buttons stacked vertically
 */
const LaunchView = () => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const enterInterScenario = useReportsStore((s) => s.enterInterScenario);
  const enterInterWhatif = useReportsStore((s) => s.enterInterWhatif);
  const enterInterFeature = useReportsStore((s) => s.enterInterFeature);

  const { data: whatifs = [] } = useFetchWhatifs(project, scenario);
  const { data: scenarios = [] } = useFetchScenarios(project);

  const [pickerMode, setPickerMode] = useState(null); // 'scenario' | 'whatif' | null

  if (!project || !scenario) {
    return (
      <div style={centredStyle}>
        <Empty description="Please select a project and scenario first." />
      </div>
    );
  }

  const handleCompareScenarios = () => {
    if (scenarios.length <= 1) {
      // Only one scenario — go straight in with just it
      enterInterScenario([scenario]);
    } else {
      setPickerMode('scenario');
    }
  };

  const handleCompareWhatifs = () => {
    if (whatifs.length === 0) {
      // No what-ifs — go straight in, will show empty state
      enterInterWhatif(scenario, []);
    } else if (whatifs.length <= 3) {
      // Few what-ifs — auto-select all
      enterInterWhatif(scenario, whatifs);
    } else {
      setPickerMode('whatif');
    }
  };

  const handleCompareFeatures = () => {
    // For MVP, start with demand as the default feature column
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

  // Default plot slots for the launch column
  const defaultSlots = [{ id: 'launch-default', feature: 'demand' }];

  return (
    <>
      <div style={layoutStyle}>
        {/* Left: scenario column */}
        <div style={leftStyle}>
          <ReportColumn
            columnDef={{ type: 'scenario', scenario }}
            plotSlots={defaultSlots}
            hasOwnAddPlot
            onAddPlot={() => {}}
          />
        </div>

        {/* Right: action buttons */}
        <div style={rightStyle}>
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

/**
 * Blue circle + label action button (matches mockup).
 */
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
  gap: 32,
  minHeight: 400,
};

const leftStyle = {
  flex: '1 1 55%',
  minWidth: 350,
  maxWidth: 600,
};

const rightStyle = {
  flex: '1 1 40%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
  gap: 24,
  padding: '40px 20px',
};

const centredStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 80,
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

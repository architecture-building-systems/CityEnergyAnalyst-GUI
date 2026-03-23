import { useState, useCallback } from 'react';
import { Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import { useFetchWhatifs, useFetchScenarios } from '../hooks/useReportsData';
import ReportColumn from './ReportColumn';
import AddPlotButton from './AddPlotButton';
import ScenarioPicker from './ScenarioPicker';
import PlotEditModal from './PlotEditModal';

/**
 * Launch view — entry point for Reports Mode.
 *
 * Layout (matching mockup):
 *   White card on the left (~45%) with scenario column
 *   Three blue ⊕ action buttons positioned to the right, spread vertically
 *     - "Compare Scenarios" aligned with the map area
 *     - "Compare What-ifs" aligned with the chart area
 *     - "Compare Feature Results" below that
 *   "Add a plot" at the bottom-left below the chart
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
  const [launchSlots, setLaunchSlots] = useState([
    { id: 'launch-default', feature: 'demand' },
  ]);
  const [editingSlotId, setEditingSlotId] = useState(null);

  const handleAddPlot = useCallback(() => {
    setLaunchSlots((prev) => [
      ...prev,
      { id: `launch-${Date.now()}`, feature: 'demand' },
    ]);
  }, []);

  const handleEditSlot = useCallback((slotId) => {
    setEditingSlotId(slotId);
  }, []);

  const handleResetSlot = useCallback((slotId) => {
    setLaunchSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, plotConfig: undefined } : s,
      ),
    );
  }, []);

  const handleEditSave = useCallback(
    (plotConfig) => {
      setLaunchSlots((prev) =>
        prev.map((s) =>
          s.id === editingSlotId ? { ...s, plotConfig } : s,
        ),
      );
      setEditingSlotId(null);
    },
    [editingSlotId],
  );

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

  return (
    <>
      <div style={layoutStyle}>
        {/* White card with scenario column + "Add a plot" inside */}
        <div style={cardStyle}>
          <ReportColumn
            columnDef={{ type: 'scenario', scenario }}
            plotSlots={launchSlots}
            onEditSlot={handleEditSlot}
            onResetSlot={handleResetSlot}
          />
          <div style={addPlotInsideStyle}>
            <AddPlotButton label="Add a plot" onClick={handleAddPlot} />
          </div>
        </div>

        {/* Action buttons — spread vertically alongside the card */}
        <div style={actionsStyle}>
          <ActionButton
            label="Compare Scenarios"
            onClick={handleCompareScenarios}
          />
          <div style={actionSpacerStyle} />
          <ActionButton
            label="Compare What-ifs"
            onClick={handleCompareWhatifs}
          />
          <ActionButton
            label="Show Feature Results"
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

      {/* Plot edit modal */}
      {editingSlotId && (
        <PlotEditModal
          open
          scenario={scenario}
          plotConfig={
            launchSlots.find((s) => s.id === editingSlotId)?.plotConfig || null
          }
          onSave={handleEditSave}
          onCancel={() => setEditingSlotId(null)}
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
  alignItems: 'stretch',
  gap: 24,
};

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
  width: '45%',
  minWidth: 360,
  padding: '20px 24px',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
};

const actionsStyle = {
  display: 'flex',
  flexDirection: 'column',
  paddingTop: 16,
  paddingBottom: 16,
  gap: 20,
};

// Flexible spacer pushes the bottom two buttons down
const actionSpacerStyle = {
  flex: 1,
  minHeight: 60,
};

const addPlotInsideStyle = {
  marginTop: 12,
  borderTop: '1px solid #eee',
  paddingTop: 12,
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

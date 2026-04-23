import { useState, useCallback, useRef } from 'react';
import { Empty } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import { useFetchWhatifs, useFetchScenarios } from '../hooks/useReportsData';
import ReportColumn from './ReportColumn';
import AddPlotButton from './AddPlotButton';
import CircleActionButton from './CircleActionButton';
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
  const [cardWidth, setCardWidth] = useState(null); // null = use default CSS %
  const cardDragRef = useRef(null);

  const handleCardDragStart = useCallback((e) => {
    e.preventDefault();
    const cardEl = e.target.parentElement;
    const startWidth = cardEl.offsetWidth;
    cardDragRef.current = { startX: e.clientX, startWidth };

    const handleMove = (moveEvent) => {
      const delta = moveEvent.clientX - cardDragRef.current.startX;
      setCardWidth(Math.max(300, cardDragRef.current.startWidth + delta));
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      cardDragRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, []);

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
        <div style={{ ...cardStyle, ...(cardWidth ? { width: cardWidth } : {}) }}>
          <ReportColumn
            columnDef={{ type: 'scenario', scenario }}
            plotSlots={launchSlots}
            onEditSlot={handleEditSlot}
            onResetSlot={handleResetSlot}
          />
          <div style={addPlotInsideStyle}>
            <AddPlotButton label="Add a plot" onClick={handleAddPlot} />
          </div>
          {/* Right-edge drag handle */}
          <div
            onMouseDown={handleCardDragStart}
            style={cardDragHandleStyle}
            title="Drag to resize"
          />
        </div>

        {/* Action buttons — spread vertically alongside the card */}
        <div style={actionsStyle}>
          <CircleActionButton
            size="md"
            label="Compare Scenarios"
            tooltip="Compare the same plot across sibling scenarios in this project."
            onClick={handleCompareScenarios}
          />
          <div style={actionSpacerStyle} />
          <CircleActionButton
            size="md"
            label="Compare What-ifs"
            tooltip="Compare the same plot across what-if variants of the current scenario."
            onClick={handleCompareWhatifs}
          />
          <CircleActionButton
            size="md"
            label="Show Feature Results"
            tooltip="Lay out different feature results side by side for this scenario."
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
  minWidth: 300,
  padding: '20px 24px',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
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

const cardDragHandleStyle = {
  position: 'absolute',
  top: '50%',
  right: 0,
  transform: 'translateY(-50%)',
  width: 6,
  height: 40,
  borderRadius: 3,
  background: 'rgba(0,0,0,0.15)',
  cursor: 'ew-resize',
  zIndex: 2,
  marginRight: 2,
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

export default LaunchView;

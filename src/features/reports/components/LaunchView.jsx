import { useState, useCallback } from 'react';
import { Empty } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import { useFetchWhatifs, useFetchScenarios } from '../hooks/useReportsData';
import ReportColumn from './ReportColumn';
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
  const [launchSlots, setLaunchSlots] = useState([]);
  // Drawer target — null when closed. Shape:
  //   { mode: 'add', feature } — on Run, create a new slot.
  //   { mode: 'edit', slotId } — on Run, update the existing slot.
  const [drawerTarget, setDrawerTarget] = useState(null);

  // Open drawer in add mode, bound to the card's feature. Optional
  // `script` pre-selects a specific plot (used by the quick-pick
  // dropdown) so the drawer skips the PlotChoices picker.
  const handleAddPlot = useCallback((feature = 'demand', script = null) => {
    setDrawerTarget({ mode: 'add', feature, script });
  }, []);

  // Open drawer in edit mode for an existing slot.
  const handleEditSlot = useCallback((slotId) => {
    setDrawerTarget({ mode: 'edit', slotId });
  }, []);

  const handleResetSlot = useCallback((slotId) => {
    setLaunchSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, plotConfig: undefined } : s,
      ),
    );
  }, []);

  const handleDeleteSlot = useCallback((slotId) => {
    setLaunchSlots((prev) => prev.filter((s) => s.id !== slotId));
  }, []);

  // Run/Save from the drawer. Commits config to the right slot, or
  // creates a new slot if we're in add mode.
  const handleDrawerSave = useCallback(
    (plotConfig) => {
      if (!drawerTarget) return;
      if (drawerTarget.mode === 'add') {
        setLaunchSlots((prev) => [
          ...prev,
          {
            id: `launch-${Date.now()}`,
            feature: drawerTarget.feature,
            plotConfig,
          },
        ]);
      } else {
        setLaunchSlots((prev) =>
          prev.map((s) =>
            s.id === drawerTarget.slotId ? { ...s, plotConfig } : s,
          ),
        );
      }
      setDrawerTarget(null);
    },
    [drawerTarget],
  );

  // Resolve the `plotConfig` seed for the drawer. In add mode, a pre-
  // selected script (via the quick-pick dropdown) seeds the drawer so
  // Tool skips the picker and jumps straight to the parameter form.
  const drawerPlotConfig =
    drawerTarget?.mode === 'edit'
      ? launchSlots.find((s) => s.id === drawerTarget.slotId)?.plotConfig || null
      : drawerTarget?.script
        ? { script: drawerTarget.script }
        : null;

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
        {/* Canvas — white background fits its content and grows with it. */}
        <div style={canvasStyle}>
          <ReportColumn
            columnDef={{ type: 'scenario', scenario }}
            plotSlots={launchSlots}
            onEditSlot={handleEditSlot}
            onResetSlot={handleResetSlot}
            onDeleteSlot={handleDeleteSlot}
            onAddPlot={handleAddPlot}
            onAddColumn={handleCompareScenarios}
            addColumnTooltip="Add scenario to compare"
          />
        </div>

        {/* Action buttons — spread vertically alongside the card.
            "Compare Scenarios" lives on the title card's "+" button. */}
        <div style={actionsStyle}>
          <CircleActionButton
            size="md"
            label="Compare What-ifs"
            tooltip="Compare the same plot across what-if variants of the current scenario."
            onClick={handleCompareWhatifs}
          />
          <div style={actionSpacerStyle} />
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

      {/* Plot config drawer — same drawer used for both add and edit. */}
      <PlotEditModal
        open={!!drawerTarget}
        mode={drawerTarget?.mode || 'add'}
        scenario={scenario}
        plotConfig={drawerPlotConfig}
        onSave={handleDrawerSave}
        onCancel={() => setDrawerTarget(null)}
      />
    </>
  );
};

const layoutStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 24,
};

// Canvas: white background that fits its content — no fixed width, no
// resize handle. Content inside (title card, map, feature cards) drives
// the size. Grows as cards are added.
const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  width: 'fit-content',
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

const centredStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 80,
  background: '#fff',
  borderRadius: 12,
};

export default LaunchView;

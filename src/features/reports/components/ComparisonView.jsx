import { useState } from 'react';
import { Empty } from 'antd';
import { CreateNewIcon } from 'assets/icons';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import { useFetchScenarios, useFetchWhatifs } from '../hooks/useReportsData';
import useYAxisAlignment from '../hooks/useYAxisAlignment';
import ReportColumn from './ReportColumn';
import ScenarioPicker from './ScenarioPicker';
import FeaturePicker from './FeaturePicker';
import PlotEditModal from './PlotEditModal';

/**
 * Comparison view — white card with columns separated by grey dividers.
 * Blue action buttons sit OUTSIDE the card on the grey background.
 */
const ComparisonView = () => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const view = useReportsStore((s) => s.view);
  const columns = useReportsStore((s) => s.columns);
  const parentScenario = useReportsStore((s) => s.parentScenario);
  const sharedPlotSlots = useReportsStore((s) => s.sharedPlotSlots);
  const columnPlotSlots = useReportsStore((s) => s.columnPlotSlots);
  const addColumn = useReportsStore((s) => s.addColumn);
  const addSharedPlotSlot = useReportsStore((s) => s.addSharedPlotSlot);
  const addColumnPlotSlot = useReportsStore((s) => s.addColumnPlotSlot);
  const updateSharedPlotSlot = useReportsStore((s) => s.updateSharedPlotSlot);
  const updateColumnPlotSlot = useReportsStore((s) => s.updateColumnPlotSlot);
  const removeSharedPlotSlot = useReportsStore((s) => s.removeSharedPlotSlot);
  const removeColumnPlotSlot = useReportsStore((s) => s.removeColumnPlotSlot);

  const [addColumnOpen, setAddColumnOpen] = useState(false);

  // Edit modal state: { slotId, columnIndex (null for shared) }
  const [editingSlot, setEditingSlot] = useState(null);

  const { data: scenarios = [] } = useFetchScenarios(project);
  const { data: whatifs = [] } = useFetchWhatifs(
    project,
    view === 'inter-whatif' ? parentScenario : null,
  );

  const isFeatureMode = view === 'inter-feature';

  // Y-axis alignment for shared modes (inter-scenario / inter-whatif)
  const { handlePlotReady } = useYAxisAlignment(
    !isFeatureMode && columns.length > 1,
    columns.length,
  );

  const getSlotsForColumn = (index) => {
    if (isFeatureMode) return columnPlotSlots[index] || [];
    return sharedPlotSlots;
  };

  const handleAddColumnConfirm = (selected) => {
    if (view === 'inter-scenario') {
      selected.forEach((s) => addColumn({ type: 'scenario', scenario: s }));
    } else if (view === 'inter-whatif') {
      selected.forEach((w) =>
        addColumn({ type: 'whatif', scenario: parentScenario, whatif: w }),
      );
    } else if (view === 'inter-feature') {
      selected.forEach((f) =>
        addColumn({ type: 'feature', scenario: scenario, feature: f.key }),
      );
    }
    setAddColumnOpen(false);
  };

  const handleAddSharedPlot = (feature = 'demand') => {
    addSharedPlotSlot({ feature });
  };

  const handleAddColumnPlot = (colIndex, feature) => {
    addColumnPlotSlot(colIndex, { feature });
  };

  // Find the current plotConfig for the slot being edited
  const getEditingPlotConfig = () => {
    if (!editingSlot) return null;
    const { slotId, columnIndex } = editingSlot;
    const slots =
      columnIndex != null ? columnPlotSlots[columnIndex] || [] : sharedPlotSlots;
    const slot = slots.find((s) => s.id === slotId);
    return slot?.plotConfig || null;
  };

  // Get the scenario for the editing context
  const getEditingScenario = () => {
    if (!editingSlot) return scenario;
    if (editingSlot.columnIndex != null) {
      return columns[editingSlot.columnIndex]?.scenario || scenario;
    }
    return columns[0]?.scenario || scenario;
  };

  const handleEditSlot = (slotId, columnIndex) => {
    setEditingSlot({ slotId, columnIndex });
  };

  const handleResetSlot = (slotId, columnIndex) => {
    if (columnIndex != null) {
      updateColumnPlotSlot(columnIndex, slotId, { plotConfig: undefined });
    } else {
      updateSharedPlotSlot(slotId, { plotConfig: undefined });
    }
  };

  const handleDeleteSlot = (slotId, columnIndex) => {
    if (columnIndex != null) {
      removeColumnPlotSlot(columnIndex, slotId);
    } else {
      removeSharedPlotSlot(slotId);
    }
  };

  const handleEditSave = (plotConfig) => {
    if (!editingSlot) return;
    const { slotId, columnIndex } = editingSlot;
    if (columnIndex != null) {
      updateColumnPlotSlot(columnIndex, slotId, { plotConfig });
    } else {
      updateSharedPlotSlot(slotId, { plotConfig });
    }
    setEditingSlot(null);
  };

  if (columns.length === 0) {
    return (
      <div style={emptyStyle}>
        <Empty description="No columns yet." />
      </div>
    );
  }

  return (
    <div>
      {/* Scenario name header for inter-feature mode */}
      {isFeatureMode && columns.length > 0 && (
        <div style={featureModeHeaderStyle}>{columns[0].scenario}</div>
      )}

      {/* Canvas — white background fits its columns and grows as more are added. */}
      <div style={canvasWrapperStyle}>
        <div style={canvasStyle}>
          <div style={columnsRowStyle}>
            {columns.map((col, i) => (
              <div
                key={columnKey(col)}
                style={{
                  ...columnCellStyle,
                  borderRight:
                    i < columns.length - 1 ? '1px solid #e0e0e0' : 'none',
                }}
              >
                <ReportColumn
                  columnDef={col}
                  plotSlots={getSlotsForColumn(i)}
                  onEditSlot={(slotId) =>
                    handleEditSlot(slotId, isFeatureMode ? i : null)
                  }
                  onResetSlot={(slotId) =>
                    handleResetSlot(slotId, isFeatureMode ? i : null)
                  }
                  onDeleteSlot={(slotId) =>
                    handleDeleteSlot(slotId, isFeatureMode ? i : null)
                  }
                  onPlotReady={!isFeatureMode ? handlePlotReady : undefined}
                  onAddPlot={(feature) =>
                    isFeatureMode
                      ? handleAddColumnPlot(i, feature)
                      : handleAddSharedPlot(feature)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Floating add-column button — top-right, outside card */}
        <button
          type="button"
          onClick={() => setAddColumnOpen(true)}
          style={floatingAddStyle}
          title={
            view === 'inter-scenario'
              ? 'Add a scenario'
              : view === 'inter-whatif'
                ? 'Add a what-if'
                : 'Add a feature'
          }
        >
          <CreateNewIcon style={{ color: '#fff', fontSize: 18 }} />
        </button>
      </div>

      {/* "Add a plot" now lives inside each FeatureCard within each column. */}

      {/* Add-column picker modals */}
      {addColumnOpen && view === 'inter-feature' && (
        <FeaturePicker
          open
          single
          scenario={scenario}
          onConfirm={handleAddColumnConfirm}
          onCancel={() => setAddColumnOpen(false)}
        />
      )}
      {addColumnOpen && (view === 'inter-scenario' || view === 'inter-whatif') && (
        <ScenarioPicker
          open
          single
          mode={view === 'inter-scenario' ? 'scenario' : 'whatif'}
          scenarios={scenarios}
          whatifs={whatifs}
          scenario={scenario}
          onConfirm={handleAddColumnConfirm}
          onCancel={() => setAddColumnOpen(false)}
        />
      )}

      {/* Plot edit modal */}
      {editingSlot && (
        <PlotEditModal
          open
          scenario={getEditingScenario()}
          plotConfig={getEditingPlotConfig()}
          onSave={handleEditSave}
          onCancel={() => setEditingSlot(null)}
        />
      )}
    </div>
  );
};

function columnKey(col) {
  if (col.type === 'scenario') return `s-${col.scenario}`;
  if (col.type === 'whatif') return `w-${col.scenario}-${col.whatif}`;
  if (col.type === 'feature') return `f-${col.scenario}-${col.feature}`;
  return String(Math.random());
}

const canvasWrapperStyle = {
  position: 'relative',
  width: 'fit-content',
};

// Canvas: white background fits its content. Columns inside carry their
// own minWidth, so the canvas grows as more columns are added and shrinks
// back when columns are removed.
const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
  width: 'fit-content',
};

const columnsRowStyle = {
  display: 'flex',
  overflowX: 'auto',
};

const columnCellStyle = {
  flex: '1 1 0',
  minWidth: '30vw',
  padding: '20px 24px',
};

const floatingAddStyle = {
  position: 'absolute',
  top: -8,
  right: -8,
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#1470AF',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 5,
  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
};

const featureModeHeaderStyle = {
  fontSize: 22,
  fontWeight: 700,
  color: '#222',
  marginBottom: 8,
};

const emptyStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 48,
  background: '#fff',
  borderRadius: 12,
};

export default ComparisonView;

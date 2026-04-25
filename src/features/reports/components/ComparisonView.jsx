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

const ComparisonView = ({ onOpenDrawer }) => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const view = useReportsStore((s) => s.view);
  const columns = useReportsStore((s) => s.columns);
  const parentScenario = useReportsStore((s) => s.parentScenario);
  const sharedCards = useReportsStore((s) => s.sharedCards);
  const columnCards = useReportsStore((s) => s.columnCards);
  const addColumn = useReportsStore((s) => s.addColumn);
  const addCard = useReportsStore((s) => s.addCard);
  const addPlot = useReportsStore((s) => s.addPlot);
  const updatePlot = useReportsStore((s) => s.updatePlot);
  const removePlot = useReportsStore((s) => s.removePlot);
  const removeCard = useReportsStore((s) => s.removeCard);
  const applyCardLayouts = useReportsStore((s) => s.applyCardLayouts);

  const [addColumnOpen, setAddColumnOpen] = useState(false);

  const { data: scenarios = [] } = useFetchScenarios(project);
  const { data: whatifs = [] } = useFetchWhatifs(
    project,
    view === 'inter-whatif' ? parentScenario : null,
  );

  const isFeatureMode = view === 'inter-feature';
  const columnKeyForMode = isFeatureMode ? 'per-column' : 'shared';

  const { handlePlotReady } = useYAxisAlignment(
    !isFeatureMode && columns.length > 1,
    columns.length,
  );

  const getColumnIndexFor = (colIndex) => (isFeatureMode ? colIndex : null);
  const getCardsForColumn = (colIndex) =>
    isFeatureMode ? columnCards[colIndex] || [] : sharedCards;

  const inferFeature = (columnIndex, targetCardId) => {
    const cards = getCardsForColumn(columnIndex ?? 0);
    const target = targetCardId
      ? cards.find((c) => c.id === targetCardId)
      : null;
    return target?.feature || 'demand';
  };

  const scenarioForColumn = (columnIndex) => {
    if (columnIndex != null) {
      return columns[columnIndex]?.scenario || scenario;
    }
    return columns[0]?.scenario || scenario;
  };

  // ── Drawer open handlers ──────────────────────────────────────

  const handleAddCard =
    (colIndex) =>
    ({ targetCardId, direction, feature, script }) => {
      const columnIndex = getColumnIndexFor(colIndex);
      const resolvedFeature =
        feature || inferFeature(columnIndex, targetCardId);
      onOpenDrawer({
        mode: 'add',
        scenario: scenarioForColumn(columnIndex),
        plotConfig: script ? { script } : null,
        onSave: (plotConfig) =>
          addCard(columnIndex, {
            targetCardId,
            direction,
            feature: resolvedFeature,
            plotConfig,
          }),
      });
    };

  const handleAddPlotToCard =
    (colIndex) =>
    (cardId, script = null) => {
      const columnIndex = getColumnIndexFor(colIndex);
      onOpenDrawer({
        mode: 'add',
        scenario: scenarioForColumn(columnIndex),
        plotConfig: script ? { script } : null,
        onSave: (plotConfig) => addPlot(columnIndex, cardId, plotConfig),
      });
    };

  const handleEditPlot = (colIndex) => (cardId, plotId) => {
    const columnIndex = getColumnIndexFor(colIndex);
    const cards = getCardsForColumn(colIndex);
    const existing =
      cards.find((c) => c.id === cardId)?.plots.find((p) => p.id === plotId)
        ?.plotConfig || null;
    onOpenDrawer({
      mode: 'edit',
      scenario: scenarioForColumn(columnIndex),
      plotConfig: existing,
      onSave: (plotConfig) =>
        updatePlot(columnIndex, cardId, plotId, plotConfig),
    });
  };

  const handleResetPlot = (colIndex) => (cardId, plotId) => {
    updatePlot(getColumnIndexFor(colIndex), cardId, plotId, undefined);
  };

  const handleDeletePlot = (colIndex) => (cardId, plotId) => {
    removePlot(getColumnIndexFor(colIndex), cardId, plotId);
  };

  const handleDeleteCard = (colIndex) => (cardId) => {
    removeCard(getColumnIndexFor(colIndex), cardId);
  };

  // ── Add-column picker (unchanged) ─────────────────────────────

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

  if (columns.length === 0) {
    return (
      <div style={emptyStyle}>
        <Empty description="No columns yet." />
      </div>
    );
  }

  return (
    <div>
      {isFeatureMode && columns.length > 0 && (
        <div style={featureModeHeaderStyle}>{columns[0].scenario}</div>
      )}

      <div style={canvasWrapperStyle}>
        <div style={canvasStyle}>
          <div style={columnsRowStyle}>
            {columns.map((col, i) => (
              <div
                key={`${columnKeyForMode}-${columnKey(col)}`}
                style={{
                  ...columnCellStyle,
                  borderRight:
                    i < columns.length - 1 ? '1px solid #e0e0e0' : 'none',
                }}
              >
                <ReportColumn
                  columnDef={col}
                  cards={getCardsForColumn(i)}
                  onEditPlot={handleEditPlot(i)}
                  onResetPlot={handleResetPlot(i)}
                  onDeletePlot={handleDeletePlot(i)}
                  onDeleteCard={handleDeleteCard(i)}
                  onPlotReady={!isFeatureMode ? handlePlotReady : undefined}
                  onAddPlotToCard={handleAddPlotToCard(i)}
                  onAddCard={handleAddCard(i)}
                  onApplyLayouts={(updates) =>
                    applyCardLayouts(getColumnIndexFor(i), updates)
                  }
                />
              </div>
            ))}
          </div>
        </div>

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

      {addColumnOpen && view === 'inter-feature' && (
        <FeaturePicker
          open
          single
          onConfirm={handleAddColumnConfirm}
          onCancel={() => setAddColumnOpen(false)}
        />
      )}
      {addColumnOpen &&
        (view === 'inter-scenario' || view === 'inter-whatif') && (
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

// Mirrors LaunchView.canvasStyle — see that file's comment for the
// padding math; both views must stay in sync.
const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '16px 72px 72px 16px',
  width: 'fit-content',
  height: 'fit-content',
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

import { useState, useCallback } from 'react';
import { Empty } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import { useFetchScenarios } from '../hooks/useReportsData';
import ReportColumn from './ReportColumn';
import ScenarioPicker from './ScenarioPicker';

/**
 * Launch view — entry point for Reports Mode.
 *
 * State is local (not store-backed). Card grid uses the same shape as
 * the store: `cards: [{ id, row, col, feature, plots: [{ id, plotConfig }] }]`.
 *
 * Drawer state is owned by `ReportsPage` and opened via the
 * `onOpenDrawer` callback — so the plot tool renders in its own
 * grid cell at page level, not nested inside this view.
 */
const LaunchView = ({ onOpenDrawer }) => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const enterInterScenario = useReportsStore((s) => s.enterInterScenario);

  const { data: scenarios = [] } = useFetchScenarios(project);

  const [pickerMode, setPickerMode] = useState(null);
  const [cards, setCards] = useState([]);

  const makeId = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const shiftForInsert = (arr, { row, col, direction }) => {
    if (direction === 'right') {
      return arr.map((c) =>
        c.row === row && c.col >= col ? { ...c, col: c.col + 1 } : c,
      );
    }
    if (direction === 'bottom') {
      return arr.map((c) =>
        c.col === col && c.row >= row ? { ...c, row: c.row + 1 } : c,
      );
    }
    return arr;
  };

  const insertCard = useCallback(
    ({ targetCardId, direction, feature, plotConfig }) => {
      setCards((prev) => {
        const target = targetCardId
          ? prev.find((c) => c.id === targetCardId)
          : null;
        let row = 0;
        let col = 0;
        if (target) {
          if (direction === 'right') {
            row = target.row;
            col = target.col + 1;
          } else if (direction === 'bottom') {
            row = target.row + 1;
            col = target.col;
          }
        }
        const shifted = shiftForInsert(prev, { row, col, direction });
        return [
          ...shifted,
          {
            id: makeId('card'),
            row,
            col,
            feature,
            plots: plotConfig
              ? [{ id: makeId('plot'), plotConfig }]
              : [],
          },
        ];
      });
    },
    [],
  );

  // ── Drawer open handlers ───────────────────────────────────

  const handleAddCard = useCallback(
    ({ targetCardId, direction, feature, script }) => {
      const resolvedFeature =
        feature || inferFeatureForTarget(cards, targetCardId);
      onOpenDrawer({
        mode: 'add',
        scenario,
        plotConfig: script ? { script } : null,
        onSave: (plotConfig) =>
          insertCard({
            targetCardId,
            direction,
            feature: resolvedFeature,
            plotConfig,
          }),
      });
    },
    [cards, insertCard, onOpenDrawer, scenario],
  );

  const handleAddPlotToCard = useCallback(
    (cardId, script = null) => {
      onOpenDrawer({
        mode: 'add',
        scenario,
        plotConfig: script ? { script } : null,
        onSave: (plotConfig) =>
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardId
                ? {
                    ...c,
                    plots: [...c.plots, { id: makeId('plot'), plotConfig }],
                  }
                : c,
            ),
          ),
      });
    },
    [onOpenDrawer, scenario],
  );

  const handleEditPlot = useCallback(
    (cardId, plotId) => {
      const card = cards.find((c) => c.id === cardId);
      const existing = card?.plots.find((p) => p.id === plotId)?.plotConfig;
      onOpenDrawer({
        mode: 'edit',
        scenario,
        plotConfig: existing || null,
        onSave: (plotConfig) =>
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardId
                ? {
                    ...c,
                    plots: c.plots.map((p) =>
                      p.id === plotId ? { ...p, plotConfig } : p,
                    ),
                  }
                : c,
            ),
          ),
      });
    },
    [cards, onOpenDrawer, scenario],
  );

  const handleResetPlot = useCallback((cardId, plotId) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              plots: c.plots.map((p) =>
                p.id === plotId ? { ...p, plotConfig: undefined } : p,
              ),
            }
          : c,
      ),
    );
  }, []);

  const handleDeletePlot = useCallback((cardId, plotId) => {
    setCards((prev) =>
      prev
        .map((c) =>
          c.id === cardId
            ? { ...c, plots: c.plots.filter((p) => p.id !== plotId) }
            : c,
        )
        .filter((c) => c.plots.length > 0),
    );
  }, []);

  const handleDeleteCard = useCallback((cardId) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

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

  const handlePickerConfirm = (selected) => {
    if (pickerMode === 'scenario') {
      enterInterScenario(selected);
    }
    setPickerMode(null);
  };

  return (
    <>
      <div style={canvasStyle}>
        <ReportColumn
          columnDef={{ type: 'scenario', scenario }}
          cards={cards}
          onEditPlot={handleEditPlot}
          onResetPlot={handleResetPlot}
          onDeletePlot={handleDeletePlot}
          onDeleteCard={handleDeleteCard}
          onAddPlotToCard={handleAddPlotToCard}
          onAddCard={handleAddCard}
          onAddColumn={handleCompareScenarios}
          addColumnTooltip="Add Scenario to compare"
        />
      </div>

      {pickerMode && (
        <ScenarioPicker
          open
          mode={pickerMode}
          project={project}
          scenario={scenario}
          scenarios={scenarios}
          onConfirm={handlePickerConfirm}
          onCancel={() => setPickerMode(null)}
        />
      )}
    </>
  );
};

function inferFeatureForTarget(cards, targetCardId) {
  if (!targetCardId) return 'demand';
  const target = cards.find((c) => c.id === targetCardId);
  return target?.feature || 'demand';
}

const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '20px 56px 20px 24px',
  display: 'flex',
  flexDirection: 'column',
  width: 'fit-content',
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

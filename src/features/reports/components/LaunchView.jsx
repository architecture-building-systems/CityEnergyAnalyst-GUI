import { useState, useCallback } from 'react';
import { Empty } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useReportsStore } from '../stores/reportsStore';
import { useFetchScenarios } from '../hooks/useReportsData';
import ReportColumn from './ReportColumn';
import ScenarioPicker from './ScenarioPicker';
import PlotEditModal from './PlotEditModal';

/**
 * Launch view — entry point for Reports Mode.
 *
 * State is local (not store-backed). Card grid uses the same shape as
 * the store: `cards: [{ id, row, col, feature, plots: [{ id, plotConfig }] }]`.
 *
 * Layout:
 *   Canvas (white rounded panel) fits its content:
 *     Title card + "+" (add scenario to compare)
 *     Map card
 *     Grid of feature cards — expands SE as the user clicks + edges.
 */
const LaunchView = () => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const enterInterScenario = useReportsStore((s) => s.enterInterScenario);

  const { data: scenarios = [] } = useFetchScenarios(project);

  const [pickerMode, setPickerMode] = useState(null);
  const [cards, setCards] = useState([]);

  // Drawer target — null when closed. Shape:
  //   { mode: 'add-card', targetCardId, direction, feature, script }
  //   { mode: 'add-plot', cardId, script }
  //   { mode: 'edit', cardId, plotId }
  const [drawerTarget, setDrawerTarget] = useState(null);

  const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // ── Grid operations (mirror the store's card API, local state) ──

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

  // + right / + bottom on an existing card, or the fallback card's
  // Add-a-plot when the column is empty.
  const handleAddCard = useCallback(
    ({ targetCardId, direction, feature, script }) => {
      setDrawerTarget({
        mode: 'add-card',
        targetCardId,
        direction,
        feature: feature || inferFeatureForTarget(cards, targetCardId),
        script: script || null,
      });
    },
    [cards],
  );

  // "Add a plot" inside an existing card.
  const handleAddPlotToCard = useCallback((cardId, script = null) => {
    setDrawerTarget({ mode: 'add-plot', cardId, script });
  }, []);

  const handleEditPlot = useCallback((cardId, plotId) => {
    setDrawerTarget({ mode: 'edit', cardId, plotId });
  }, []);

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

  // Run from the drawer. Routes to the right operation.
  const handleDrawerSave = useCallback(
    (plotConfig) => {
      if (!drawerTarget) return;
      if (drawerTarget.mode === 'add-card') {
        insertCard({
          targetCardId: drawerTarget.targetCardId,
          direction: drawerTarget.direction,
          feature: drawerTarget.feature,
          plotConfig,
        });
      } else if (drawerTarget.mode === 'add-plot') {
        setCards((prev) =>
          prev.map((c) =>
            c.id === drawerTarget.cardId
              ? {
                  ...c,
                  plots: [...c.plots, { id: makeId('plot'), plotConfig }],
                }
              : c,
          ),
        );
      } else if (drawerTarget.mode === 'edit') {
        setCards((prev) =>
          prev.map((c) =>
            c.id === drawerTarget.cardId
              ? {
                  ...c,
                  plots: c.plots.map((p) =>
                    p.id === drawerTarget.plotId ? { ...p, plotConfig } : p,
                  ),
                }
              : c,
          ),
        );
      }
      setDrawerTarget(null);
    },
    [drawerTarget, insertCard],
  );

  // Seed the drawer's plotConfig from the target.
  const drawerPlotConfig =
    drawerTarget?.mode === 'edit'
      ? cards
          .find((c) => c.id === drawerTarget.cardId)
          ?.plots.find((p) => p.id === drawerTarget.plotId)?.plotConfig || null
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
          onAddPlotToCard={handleAddPlotToCard}
          onAddCard={handleAddCard}
          onAddColumn={handleCompareScenarios}
          addColumnTooltip="Add scenario to compare"
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

      <PlotEditModal
        open={!!drawerTarget}
        mode={drawerTarget?.mode === 'edit' ? 'edit' : 'add'}
        scenario={scenario}
        plotConfig={drawerPlotConfig}
        onSave={handleDrawerSave}
        onCancel={() => setDrawerTarget(null)}
      />
    </>
  );
};

// Find the neighbour card's feature so + right / + bottom start with a
// sensible default. Caller overrides this when it knows better.
function inferFeatureForTarget(cards, targetCardId) {
  if (!targetCardId) return 'demand';
  const target = cards.find((c) => c.id === targetCardId);
  return target?.feature || 'demand';
}

// Extra right padding reserves space for the + right affordance that
// FeatureCard positions absolutely outside the card's right edge. The
// card content stays within the inner content box (left padding) and
// the + button lives in the right padding — both covered by the
// canvas's white background.
// Width:   cea-card-icon-button-container button = 30 + container padding 3x2 = 36
// Gap:     8px between card and button
// Total:   44px; round up to 56 for breathing room.
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

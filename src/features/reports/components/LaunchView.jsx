import { useState, useCallback } from 'react';
import { Empty } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import {
  useReportsStore,
  DEFAULT_CARD_W,
  DEFAULT_CARD_H,
  MAP_ANCHOR_W,
  MAP_ANCHOR_H,
} from '../stores/reportsStore';
import { useFetchScenarios } from '../hooks/useReportsData';
import ReportColumn from './ReportColumn';
import ScenarioPicker from './ScenarioPicker';

/**
 * Launch view — Reports Mode entry. State is local (not store-
 * backed); the card shape matches the store
 * (`{ id, row, col, w, h, feature, plots[] }`) so promoting a draft
 * to a comparison view is a straight assignment when the moment
 * comes.
 *
 * Drawer state lives in `ReportsPage`; `onOpenDrawer` opens it.
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
        // `targetCardId === 'MAP'` is the sentinel from the map
        // tile's edge `+` buttons: right → just past the map,
        // bottom → just below it. Map footprint constants
        // (MAP_ANCHOR_W/H) are imported from the store so launch +
        // comparison views agree on the anchor points.
        let row = 0;
        let col = 0;
        if (targetCardId === 'MAP') {
          if (direction === 'bottom') {
            row = MAP_ANCHOR_H;
          } else {
            col = MAP_ANCHOR_W;
          }
        } else if (targetCardId) {
          const target = prev.find((c) => c.id === targetCardId);
          if (target) {
            if (direction === 'right') {
              row = target.row;
              col = target.col + 1;
            } else if (direction === 'bottom') {
              row = target.row + 1;
              col = target.col;
            }
          }
        }
        const shifted = shiftForInsert(prev, { row, col, direction });
        return [
          ...shifted,
          {
            id: makeId('card'),
            row,
            col,
            w: DEFAULT_CARD_W,
            h: DEFAULT_CARD_H,
            feature,
            plots: plotConfig ? [{ id: makeId('plot'), plotConfig }] : [],
          },
        ];
      });
    },
    [],
  );

  const applyCardLayouts = useCallback((updates) => {
    setCards((prev) => {
      const byId = new Map(updates.map((u) => [u.id, u]));
      return prev.map((c) => {
        const u = byId.get(c.id);
        return u ? { ...c, row: u.row, col: u.col, w: u.w, h: u.h } : c;
      });
    });
  }, []);

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
          onDeletePlot={handleDeletePlot}
          onDeleteCard={handleDeleteCard}
          onAddPlotToCard={handleAddPlotToCard}
          onAddCard={handleAddCard}
          onApplyLayouts={applyCardLayouts}
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

// Right/bottom padding (72 px ≈ 40 px button overhang + 32 px
// clearance) leaves breathing room past the `+` buttons hanging off
// the map tile's edges. `fit-content` stops ReportsPage's grid cell
// from stretching the canvas to full row height.
const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '16px 72px 72px 16px',
  height: 'fit-content',
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

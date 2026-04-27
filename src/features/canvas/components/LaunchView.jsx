import { useState, useCallback } from 'react';
import { Empty } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import {
  useCanvasStore,
  DEFAULT_CARD_W,
  DEFAULT_CARD_H,
  MAP_ANCHOR_W,
  MAP_ANCHOR_H,
} from '../stores/canvasStore';
import { useFetchScenarios } from '../hooks/useCanvasData';
import CanvasColumn from './CanvasColumn';
import ScenarioPicker from './ScenarioPicker';

/**
 * Launch view — Canvas Builder entry. State is local (not store-backed);
 * the card shape matches the store (`{ id, type, row, col, w, h,
 * feature?, plots?, category?, layer? }`) so promoting a draft to a
 * comparison view is a straight assignment when the moment comes.
 *
 * Drawer + bottom-card state live in `CanvasPage`; `onOpenDrawer`
 * opens the plot-tool drawer (Plot cards), `onOpenMapBottom` opens
 * the `MapLayerPropertiesCard` row at the bottom (Map cards).
 */
const LaunchView = ({
  onOpenDrawer,
  onOpenMapBottom,
  editingPlotCardId,
  activeMapCardId,
}) => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const enterInterScenario = useCanvasStore((s) => s.enterInterScenario);
  const exportMode = useCanvasStore((s) => s.exportMode);

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
    ({
      targetCardId,
      direction,
      type = 'plot',
      feature,
      plotConfig,
      category,
      layer,
    }) => {
      // Generate the new card's id outside `setCards` so callers can
      // act on it (e.g. open the bottom for the newly-added Map card).
      const newCardId = makeId('card');
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
            // Place the new card past the target's right or bottom
            // edge using the target's actual width / height. A
            // `+ 1` here lands inside the target's footprint
            // (default card is 6 cols × 10 rows), and rgl's
            // collision resolution then pushes the new card down
            // to the next free row — making every right-insert
            // silently turn into a bottom-insert.
            if (direction === 'right') {
              row = target.row;
              col = target.col + target.w;
            } else if (direction === 'bottom') {
              row = target.row + target.h;
              col = target.col;
            }
          }
        }
        const shifted = shiftForInsert(prev, { row, col, direction });
        return [
          ...shifted,
          {
            id: newCardId,
            type,
            row,
            col,
            w: DEFAULT_CARD_W,
            h: DEFAULT_CARD_H,
            feature,
            category,
            layer,
            plots: plotConfig ? [{ id: makeId('plot'), plotConfig }] : [],
          },
        ];
      });
      return newCardId;
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
    ({
      targetCardId,
      direction,
      type = 'plot',
      feature,
      script,
      category,
      layer,
    }) => {
      // Map cards skip the plot-tool drawer — insert the card and
      // open the page-level MapLayerProperties bottom card so the
      // user can adjust the layer's parameters there.
      if (type === 'map') {
        const newCardId = insertCard({
          targetCardId,
          direction,
          type: 'map',
          category,
          layer,
        });
        onOpenMapBottom?.(newCardId);
        return;
      }
      const resolvedFeature =
        feature || inferFeatureForTarget(cards, targetCardId);
      onOpenDrawer({
        plotConfig: script ? { script } : null,
        onSave: (plotConfig) =>
          insertCard({
            targetCardId,
            direction,
            type,
            feature: resolvedFeature,
            plotConfig,
          }),
      });
    },
    [cards, insertCard, onOpenDrawer, onOpenMapBottom],
  );

  const handleAddPlotToCard = useCallback(
    (cardId, script = null) => {
      onOpenDrawer({
        cardId,
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
    [onOpenDrawer],
  );

  const handleEditPlot = useCallback(
    (cardId, plotId) => {
      const card = cards.find((c) => c.id === cardId);
      const existing = card?.plots.find((p) => p.id === plotId)?.plotConfig;
      onOpenDrawer({
        cardId,
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
    [cards, onOpenDrawer],
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
      <div style={exportMode ? canvasExportStyle : canvasStyle}>
        <CanvasColumn
          columnDef={{ type: 'scenario', scenario }}
          cards={cards}
          onEditPlot={handleEditPlot}
          onDeletePlot={handleDeletePlot}
          onDeleteCard={handleDeleteCard}
          onAddPlotToCard={handleAddPlotToCard}
          onAddCard={handleAddCard}
          onApplyLayouts={applyCardLayouts}
          onOpenMapBottom={onOpenMapBottom}
          editingPlotCardId={editingPlotCardId}
          activeMapCardId={activeMapCardId}
          onAddColumn={handleCompareScenarios}
          addColumnTooltip="Add Scenario to compare"
          addColumnDisabled
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
// the map tile's edges. `fit-content` stops CanvasPage's grid cell
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

// Export View hides the perimeter `+` buttons, so the right/bottom
// padding can match the left/top — symmetric 16px gutter.
const canvasExportStyle = {
  ...canvasStyle,
  padding: 16,
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

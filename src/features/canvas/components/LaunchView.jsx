import { useState } from 'react';
import { Empty } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useCanvasStore } from '../stores/canvasStore';
import CanvasColumn from './CanvasColumn';
import CompareModal from './CompareModal';

/**
 * Launch view — Canvas Builder entry. Cards live in the store
 * (`launchCards`) so the autosave hook can persist a draft canvas
 * before the user has chosen a comparison mode. Switching into
 * inter-scenario promotes the launch cards into `sharedCards`,
 * where every column mirrors the same list.
 *
 * Drawer + bottom-card state live in `CanvasPage`; `onOpenDrawer`
 * opens the plot-tool drawer (Plot cards), `onOpenMapBottom` opens
 * the `MapLayerPropertiesCard` row at the bottom (Map cards).
 *
 * The store's existing card-mutating actions (`addCard`,
 * `removeCard`, `applyCardLayouts`, `addPlot`, …) accept a
 * dispatch target — we pass `'launch'` so they operate on the
 * launch-view slice. No bespoke launch wiring lives here anymore.
 *
 * The `+` button next to the scenario title in the column header
 * is the entry point into Compare mode — opens `CompareModal` so
 * the user can pick up to 3 sibling scenarios. After confirm, the
 * store transitions to `inter-scenario` and `ComparisonView`
 * takes over.
 */
const LaunchView = ({
  onOpenDrawer,
  onOpenMapBottom,
  editingPlotCardId,
  activeMapCardId,
}) => {
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const cards = useCanvasStore((s) => s.launchCards);
  const addCard = useCanvasStore((s) => s.addCard);
  const removeCard = useCanvasStore((s) => s.removeCard);
  const applyCardLayouts = useCanvasStore((s) => s.applyCardLayouts);
  const addPlot = useCanvasStore((s) => s.addPlot);
  const updatePlot = useCanvasStore((s) => s.updatePlot);
  const removePlot = useCanvasStore((s) => s.removePlot);
  const enableEdit = useCanvasStore((s) => s.enableEdit);

  const [compareOpen, setCompareOpen] = useState(false);

  const inferFeature = (targetCardId) => {
    if (!targetCardId) return 'demand';
    const target = cards.find((c) => c.id === targetCardId);
    return target?.feature || 'demand';
  };

  // ── Drawer open handlers ───────────────────────────────────

  const handleAddCard = ({
    targetCardId,
    direction,
    type = 'plot',
    feature,
    script,
    category,
    layer,
  }) => {
    if (type === 'map') {
      const newCardId = addCard('launch', {
        targetCardId,
        direction,
        type: 'map',
        category,
        layer,
      });
      onOpenMapBottom?.(newCardId);
      return;
    }
    const resolvedFeature = feature || inferFeature(targetCardId);
    onOpenDrawer({
      plotConfig: script ? { script } : null,
      onSave: (plotConfig) =>
        addCard('launch', {
          targetCardId,
          direction,
          type,
          feature: resolvedFeature,
          plotConfig,
        }),
    });
  };

  const handleAddPlotToCard = (cardId, script = null) => {
    onOpenDrawer({
      cardId,
      plotConfig: script ? { script } : null,
      onSave: (plotConfig) => addPlot('launch', cardId, plotConfig),
    });
  };

  const handleEditPlot = (cardId, plotId) => {
    const existing =
      cards.find((c) => c.id === cardId)?.plots.find((p) => p.id === plotId)
        ?.plotConfig || null;
    onOpenDrawer({
      cardId,
      plotConfig: existing,
      onSave: (plotConfig) => updatePlot('launch', cardId, plotId, plotConfig),
    });
  };

  const handleDeletePlot = (cardId, plotId) =>
    removePlot('launch', cardId, plotId);

  const handleDeleteCard = (cardId) => removeCard('launch', cardId);

  if (!project || !scenario) {
    return (
      <div style={centredStyle}>
        <Empty description="Please select a project and scenario first." />
      </div>
    );
  }

  return (
    <>
      <div style={enableEdit ? canvasStyle : canvasExportStyle}>
        <CanvasColumn
          columnDef={{ type: 'scenario', scenario }}
          cards={cards}
          onEditPlot={handleEditPlot}
          onDeletePlot={handleDeletePlot}
          onDeleteCard={handleDeleteCard}
          onAddPlotToCard={handleAddPlotToCard}
          onAddCard={handleAddCard}
          onApplyLayouts={(updates) => applyCardLayouts('launch', updates)}
          onOpenMapBottom={onOpenMapBottom}
          editingPlotCardId={editingPlotCardId}
          activeMapCardId={activeMapCardId}
          onAddColumn={() => setCompareOpen(true)}
          addColumnTooltip="Add Scenario to compare"
        />
      </div>

      <CompareModal open={compareOpen} onCancel={() => setCompareOpen(false)} />
    </>
  );
};

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

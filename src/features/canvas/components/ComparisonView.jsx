import { useState } from 'react';
import { Empty } from 'antd';

import { useCanvasStore } from '../stores/canvasStore';
import useYAxisAlignment from '../hooks/useYAxisAlignment';
import CanvasColumn from './CanvasColumn';
import CompareModal from './CompareModal';

const ComparisonView = ({
  onOpenDrawer,
  onOpenMapBottom,
  editingPlotCardId,
  activeMapCardId,
}) => {
  const columns = useCanvasStore((s) => s.columns);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const sharedCards = useCanvasStore((s) => s.sharedCards);
  const removeColumn = useCanvasStore((s) => s.removeColumn);
  const addCard = useCanvasStore((s) => s.addCard);
  const addPlot = useCanvasStore((s) => s.addPlot);
  const updatePlot = useCanvasStore((s) => s.updatePlot);
  const removePlot = useCanvasStore((s) => s.removePlot);
  const removeCard = useCanvasStore((s) => s.removeCard);
  const applyCardLayouts = useCanvasStore((s) => s.applyCardLayouts);

  const [compareOpen, setCompareOpen] = useState(false);

  // Both comparison modes share a single card list across columns
  // — one row per card, mirrored across every scenario / what-if
  // column. No per-column dispatch needed; every store action
  // targets the shared slice via `columnIndex = null`.
  const { handlePlotReady } = useYAxisAlignment(
    columns.length > 1,
    columns.length,
  );

  const inferFeature = (targetCardId) => {
    const target = targetCardId
      ? sharedCards.find((c) => c.id === targetCardId)
      : null;
    return target?.feature || 'demand';
  };

  // ── Drawer open handlers ──────────────────────────────────────

  const handleAddCard = ({
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
      const newCardId = addCard(null, {
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
        addCard(null, {
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
      onSave: (plotConfig) => addPlot(null, cardId, plotConfig),
    });
  };

  const handleEditPlot = (cardId, plotId) => {
    const existing =
      sharedCards
        .find((c) => c.id === cardId)
        ?.plots.find((p) => p.id === plotId)?.plotConfig || null;
    onOpenDrawer({
      cardId,
      plotConfig: existing,
      onSave: (plotConfig) => updatePlot(null, cardId, plotId, plotConfig),
    });
  };

  const handleDeletePlot = (cardId, plotId) => {
    removePlot(null, cardId, plotId);
  };

  const handleDeleteCard = (cardId) => {
    removeCard(null, cardId);
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
      <div style={canvasWrapperStyle}>
        <div style={enableEdit ? canvasStyle : canvasExportStyle}>
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
                <CanvasColumn
                  columnDef={col}
                  cards={sharedCards}
                  onEditPlot={handleEditPlot}
                  onDeletePlot={handleDeletePlot}
                  onDeleteCard={handleDeleteCard}
                  onPlotReady={handlePlotReady}
                  onAddPlotToCard={handleAddPlotToCard}
                  onAddCard={handleAddCard}
                  onApplyLayouts={(updates) => applyCardLayouts(null, updates)}
                  onOpenMapBottom={onOpenMapBottom}
                  editingPlotCardId={editingPlotCardId}
                  activeMapCardId={activeMapCardId}
                  // Compare-mode chrome: leftmost is origin (full
                  // editing), the rest are read-only mirrors with
                  // an `×` to drop the column.
                  isOrigin={i === 0}
                  lockedReadOnly={i !== 0}
                  onCloseColumn={i !== 0 ? () => removeColumn(i) : undefined}
                  // Origin column's title-row `+` re-opens the
                  // CompareModal so the user can add or remove
                  // scenarios from the comparison. Pre-fills with
                  // the current picks; confirming with a different
                  // selection rebuilds the columns. Non-origin
                  // columns don't get `onAddColumn` (they already
                  // carry the `×` close affordance for removal).
                  onAddColumn={i === 0 ? () => setCompareOpen(true) : undefined}
                  addColumnTooltip="Add Scenario to compare"
                  // Compact layout: every column is a single
                  // vertical stack at the map's width. Right-edge
                  // perimeter `+` is suppressed; horizontal
                  // drag/resize is ignored.
                  compactLayout
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <CompareModal open={compareOpen} onCancel={() => setCompareOpen(false)} />
    </div>
  );
};

function columnKey(col) {
  if (col.type === 'scenario') return `s-${col.scenario}`;
  if (col.type === 'whatif') return `w-${col.scenario}-${col.whatif}`;
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

// Export View hides the perimeter `+` buttons, so the right/bottom
// padding can match the left/top — symmetric 16px gutter.
const canvasExportStyle = {
  ...canvasStyle,
  padding: 16,
};

// No `overflowX` here — that would create a horizontal scroll
// context which intercepts sticky's scrolling-ancestor lookup and
// breaks the title row's vertical pin. Horizontal overflow falls
// through to CanvasPage's canvas cell (`overflow: auto`).
const columnsRowStyle = {
  display: 'flex',
};

const columnCellStyle = {
  flex: '1 1 0',
  minWidth: '30vw',
  padding: '20px 24px',
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

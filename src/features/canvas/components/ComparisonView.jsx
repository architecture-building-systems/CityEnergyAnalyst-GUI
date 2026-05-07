import { useState } from 'react';
import { Empty } from 'antd';

import { useProjectStore } from 'features/project/stores/projectStore';
import { useHasSimulatedPathway } from 'features/pathway/hooks/usePathwayOverview';

import { useCanvasStore } from '../stores/canvasStore';
import useYAxisAlignment from '../hooks/useYAxisAlignment';
import CanvasColumn from './CanvasColumn';
import CanvasScenarioHeader from './CanvasScenarioHeader';
import CompareModal from './CompareModal';
import PathwayCompareSelect from './PathwayCompareSelect';
import PathwayMultiView from './PathwayMultiView';
import PathwayTimelineStrip from './PathwayTimelineStrip';

const ComparisonView = ({
  onOpenDrawer,
  onOpenMapBottom,
  onOpenKpiPicker,
  editingPlotCardId,
  editingColumnIndex,
  activeMapCardId,
  activeMapColumnIndex,
}) => {
  const project = useProjectStore((s) => s.project);
  const columns = useCanvasStore((s) => s.columns);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const columnCards = useCanvasStore((s) => s.columnCards);
  const view = useCanvasStore((s) => s.view);
  const hasSimulatedPathway = useHasSimulatedPathway();
  const isPathwayView = view === 'pathway-single' || view === 'pathway-multi';

  // Build the full scenario path the plot-tool form expects in
  // its `general:scenario` parameter (POSIX-style join — works on
  // every platform since the dashboard server normalises paths
  // server-side). When the user clicks Edit on a plot in column
  // N, we rewrite `parameters.scenario` to N's path so the
  // form's pickers (what-if names, building lists, etc.) load
  // from N's scenario folder rather than whichever scenario the
  // plot was originally created under.
  const scenarioPathFor = (columnIndex) => {
    const name = columns[columnIndex]?.scenario;
    if (!project || !name) return null;
    return `${project}/${name}`;
  };

  const withColumnScenario = (plotConfig, columnIndex) => {
    if (!plotConfig) return plotConfig;
    const path = scenarioPathFor(columnIndex);
    if (!path) return plotConfig;
    return {
      ...plotConfig,
      parameters: { ...(plotConfig.parameters || {}), scenario: path },
    };
  };
  const removeColumn = useCanvasStore((s) => s.removeColumn);
  const addCard = useCanvasStore((s) => s.addCard);
  const addPlot = useCanvasStore((s) => s.addPlot);
  const updatePlot = useCanvasStore((s) => s.updatePlot);
  const removePlot = useCanvasStore((s) => s.removePlot);
  const removeCard = useCanvasStore((s) => s.removeCard);
  const applyCardLayouts = useCanvasStore((s) => s.applyCardLayouts);

  const [compareOpen, setCompareOpen] = useState(false);

  // Per-column model: layout (row/col/w/h) is fanned out across
  // columns by the store, but plot content (plots, category,
  // layer) is per-column. Plot-level handlers carry the column
  // index so edits land in the right slice; row-level handlers
  // (add card, delete card, drag/resize) fan out internally —
  // the column index they're called with is just the originating
  // column.
  const { handlePlotReady } = useYAxisAlignment(
    columns.length > 1,
    columns.length,
  );

  const inferFeature = (columnIndex, targetCardId) => {
    const target = targetCardId
      ? (columnCards?.[columnIndex] || []).find((c) => c.id === targetCardId)
      : null;
    return target?.feature || 'demand';
  };

  // ── Drawer open handlers ──────────────────────────────────────

  const handleAddCard =
    (columnIndex) =>
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
        const newCardId = addCard(columnIndex, {
          targetCardId,
          direction,
          type: 'map',
          category,
          layer,
        });
        onOpenMapBottom?.(newCardId, columnIndex);
        return;
      }
      // Text cards have no upstream config; skip the drawer and
      // insert empty so the user can type directly into the editor.
      if (type === 'text') {
        addCard(columnIndex, { targetCardId, direction, type: 'text' });
        return;
      }
      // Divider cards: orientation / style / thickness live in the
      // card's own toolbar, no drawer needed.
      if (type === 'divider') {
        addCard(columnIndex, { targetCardId, direction, type: 'divider' });
        return;
      }
      if (type === 'kpi') {
        // KPI cards open the page-level multi-pick modal; the
        // anchor (column index + target + direction) is captured
        // here and replayed against `addCard` on confirm. The
        // store fans the resulting cards out across every
        // column, same as for any other card type.
        onOpenKpiPicker?.({ columnIndex, targetCardId, direction });
        return;
      }
      const resolvedFeature =
        feature || inferFeature(columnIndex, targetCardId);
      onOpenDrawer({
        plotConfig: script ? { script } : null,
        onSave: (plotConfig) =>
          addCard(columnIndex, {
            targetCardId,
            direction,
            type,
            feature: resolvedFeature,
            plotConfig,
          }),
      });
    };

  // Build the (project, scenarioName) pair the form needs to
  // scope its choice generators to the column being edited.
  const scenarioOverrideFor = (columnIndex) => {
    const name = columns[columnIndex]?.scenario;
    if (!project || !name) return null;
    return { project, scenarioName: name };
  };

  const handleAddPlotToCard =
    (columnIndex) =>
    (cardId, script = null) => {
      onOpenDrawer({
        cardId,
        // Stamp the originating column so CanvasPage can paint the
        // editing purple stroke only on the column being edited
        // (not on every column showing this card id).
        columnIndex,
        // Form scopes its parameter-schema fetch to this column's
        // scenario via `ToolScenarioOverrideContext` in
        // PlotEditModal — without this the form would always pull
        // choices from the project's active scenario.
        scenarioOverride: scenarioOverrideFor(columnIndex),
        plotConfig: script ? { script } : null,
        onSave: (plotConfig) => addPlot(columnIndex, cardId, plotConfig),
      });
    };

  const handleEditPlot = (columnIndex) => (cardId, plotId) => {
    const cards = columnCards?.[columnIndex] || [];
    const existing =
      cards.find((c) => c.id === cardId)?.plots.find((p) => p.id === plotId)
        ?.plotConfig || null;
    onOpenDrawer({
      cardId,
      columnIndex,
      scenarioOverride: scenarioOverrideFor(columnIndex),
      // Rewrite the saved plotConfig's `parameters.scenario` to
      // this column's scenario before opening the form. The plot
      // was originally created under origin's scenario; without
      // this override the form's scenario picker would show
      // origin's name even when editing in a mirror column.
      plotConfig: withColumnScenario(existing, columnIndex),
      onSave: (plotConfig) =>
        updatePlot(columnIndex, cardId, plotId, plotConfig),
    });
  };

  const handleDeletePlot = (columnIndex) => (cardId, plotId) => {
    removePlot(columnIndex, cardId, plotId);
  };

  // Row-level delete: fans out across every column via the store.
  // The originating columnIndex is unused at the action layer;
  // pass it through anyway so the dispatcher API stays uniform.
  const handleDeleteCard = (columnIndex) => (cardId) => {
    removeCard(columnIndex, cardId);
  };

  // Multi-pathway mode renders a row-based layout instead of the
  // column grid below. Routing here keeps the scenario-name header,
  // picker dropdown, and stacked rows scoped to one component
  // (`PathwayMultiView`) without bloating the inter-scenario /
  // inter-whatif / pathway-single render path.
  if (view === 'pathway-multi') {
    return <PathwayMultiView onOpenDrawer={onOpenDrawer} />;
  }

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
          {/* Pathway-single hosts the scenario title card + pathway
              picker as a top-of-canvas row, so column-0's title row
              is free to show the bare ``Y_<year>`` label. Other
              compare modes don't render the header. */}
          <CanvasScenarioHeader
            trailing={
              view === 'pathway-single' && hasSimulatedPathway ? (
                <PathwayCompareSelect />
              ) : null
            }
          />
          {view === 'pathway-single' && (
            <PathwayTimelineStrip onOpenDrawer={onOpenDrawer} />
          )}
          <div style={columnsRowStyle}>
            {columns.map((col, i) => (
              <div
                key={columnKey(col)}
                style={{
                  ...columnCellStyle,
                  // Pathway-single: align column 0's left edge with
                  // the canvas's scenario title card by dropping the
                  // 24 px left padding the State columns would
                  // otherwise inherit. Other compare modes keep the
                  // padding so the origin column has breathing room
                  // from the canvas border.
                  ...(view === 'pathway-single' && i === 0
                    ? { paddingLeft: 0 }
                    : null),
                  borderRight:
                    i < columns.length - 1 ? '1px solid #e0e0e0' : 'none',
                }}
              >
                <CanvasColumn
                  columnDef={col}
                  columnIndex={i}
                  cards={columnCards?.[i] || []}
                  // Origin column's scenario, threaded into every
                  // column so non-origin KPI cards can fetch the
                  // origin's same KPI as their delta baseline.
                  // The origin column sees the same value but
                  // `FeatureCardKpi` skips its own delta render
                  // when scenario === originScenario. React Query
                  // dedupes — the origin column's fetch satisfies
                  // every non-origin column's baseline read for
                  // free.
                  originScenario={columns[0]?.scenario ?? null}
                  onEditPlot={handleEditPlot(i)}
                  onDeletePlot={handleDeletePlot(i)}
                  onDeleteCard={handleDeleteCard(i)}
                  onPlotReady={handlePlotReady}
                  onAddPlotToCard={handleAddPlotToCard(i)}
                  onAddCard={handleAddCard(i)}
                  onOpenKpiPicker={onOpenKpiPicker}
                  onApplyLayouts={(updates) => applyCardLayouts(i, updates)}
                  onOpenMapBottom={onOpenMapBottom}
                  // Per-column editing stroke: pass the active
                  // edit's card id only to the column it
                  // originated from. Other columns see `null` and
                  // skip the purple outline even though they hold
                  // the same card id.
                  editingPlotCardId={
                    editingColumnIndex === i ? editingPlotCardId : null
                  }
                  activeMapCardId={
                    activeMapColumnIndex === i ? activeMapCardId : null
                  }
                  // Compare-mode chrome: leftmost is origin (full
                  // editing), the rest are read-only mirrors with
                  // an `×` to drop the column. Pathway compare
                  // hides the `×` because the column set is fixed
                  // by the pathway's baked years (single) or the
                  // picker selection (multi); change picks via the
                  // dropdown instead.
                  isOrigin={i === 0}
                  lockedReadOnly={i !== 0}
                  onCloseColumn={
                    i !== 0 && !isPathwayView
                      ? () => removeColumn(i)
                      : undefined
                  }
                  // Origin column's title-row `+` re-opens the
                  // CompareModal so the user can add or remove
                  // scenarios from the comparison. Pre-fills with
                  // the current picks; confirming with a different
                  // selection rebuilds the columns. Non-origin
                  // columns don't get `onAddColumn` (they already
                  // carry the `×` close affordance for removal).
                  // Pathway compare hides it entirely — the picker
                  // dropdown above the columns is the only entry
                  // for changing pathway selection.
                  onAddColumn={
                    i === 0 && !isPathwayView
                      ? () => setCompareOpen(true)
                      : undefined
                  }
                  addColumnTooltip="Add Scenario to compare"
                  // No `titleRowSlot` here — pathway-single hosts the
                  // picker in the canvas-level scenario header above
                  // the columns row, and pathway-multi has its own
                  // layout. Inter-scenario / inter-whatif compare
                  // doesn't show the picker (entry happens via
                  // LaunchView).
                  titleRowSlot={null}
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

// Stable per-render key. A `Math.random()` fallback here used to
// remount `CanvasColumn` on every render, tearing down deck.gl's
// WebGL context mid-init and aborting the camera fit — so hard
// refresh landed the maps at regional zoom instead of the building-
// level fit.
function columnKey(col) {
  if (col.type === 'scenario') return `s-${col.scenario}`;
  if (col.type === 'whatif') return `w-${col.scenario}-${col.whatif}`;
  if (col.type === 'pathway-state') return `p-${col.pathwayName}-${col.year}`;
  return col.scenario || col.type || 'col';
}

const canvasWrapperStyle = {
  position: 'relative',
  width: 'fit-content',
};

// Mirrors LaunchView.canvasStyle — see that file's comment for the
// padding math; both views must stay in sync. `display: flex` +
// `flex-direction: column` stacks the scenario header / pathway
// timeline / columns row vertically so the timeline sits above the
// columns instead of overlapping them.
const canvasStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '16px 72px 72px 16px',
  width: 'fit-content',
  height: 'fit-content',
  display: 'flex',
  flexDirection: 'column',
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

// Each column hugs its inner GridLayout width (no flex-grow, no
// minWidth floor) so there's no trailing whitespace between the
// rightmost tile and the column boundary. The canvas wrapper has
// `width: fit-content`, so the canvas itself only spans as wide
// as the sum of its columns. Top padding is small so the title
// card sits close to the canvas-card top; bottom padding is
// roomier so the last tile has breathing room.
const columnCellStyle = {
  flex: '0 0 auto',
  padding: '4px 24px 20px 24px',
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

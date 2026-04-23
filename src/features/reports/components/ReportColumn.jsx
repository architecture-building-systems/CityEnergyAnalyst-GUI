import { useMemo } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import { CreateNewIcon } from 'assets/icons';

import {
  PLOT_GROUPS,
  PLOT_LABELS,
  VIEW_PLOT_RESULTS,
} from 'features/plots/constants';
import { useProjectStore } from 'features/project/stores/projectStore';
import MapThumbnail from './MapThumbnail';
import FeatureCard from './FeatureCard';

/**
 * Build the antd Dropdown `menu.items` tree for "Add a feature card".
 * Mirrors the "Select a Plot Tool" picker (PlotChoices) exactly —
 * same nesting, same labels, same leaf-level specific plots. Derived
 * entirely from PLOT_GROUPS / PLOT_LABELS / VIEW_PLOT_RESULTS so new
 * groups or plots show up here automatically.
 *
 * `onPick(feature, script)` fires on a specific-plot click:
 *   - `feature`: the family's first map constant → drives the new
 *                card's title + quick-pick context.
 *   - `script`:  the specific plot's run script → seeds the drawer
 *                so the parameter form opens straight away.
 *
 * Visual conventions (match PlotChoices as closely as the antd Menu
 * allows):
 *   - Top-level group items are prefixed with the group's `icon`
 *     (the feature family icon from PLOT_GROUPS).
 *   - Nested items (subgroups + specific plots) are prefixed with a
 *     dash so the indentation reads even when menus wrap across
 *     column widths.
 */
const topLabel = (group) => {
  const Icon = group.icon;
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      {Icon && <Icon style={{ fontSize: 16 }} />}
      {group.label}
    </span>
  );
};

const nestedLabel = (text) => `- ${text}`;

function buildPlotMenuItems(onPick) {
  const plotLeaf = (key, familyFirstKey) => {
    const script = VIEW_PLOT_RESULTS[key];
    if (!script) return null;
    return {
      key: `${familyFirstKey}::${key}`,
      label: nestedLabel(PLOT_LABELS[key] || key),
      onClick: () => onPick(familyFirstKey, script),
    };
  };

  const subgroupLevel = (sub) => ({
    key: sub.label,
    label: nestedLabel(sub.label),
    children: sub.keys.map((k) => plotLeaf(k, sub.keys[0])).filter(Boolean),
  });

  return PLOT_GROUPS.map((group) => {
    if (group.subgroups) {
      return {
        key: group.label,
        label: topLabel(group),
        children: group.subgroups.map(subgroupLevel),
      };
    }
    return {
      key: group.label,
      label: topLabel(group),
      children: group.keys
        .map((k) => plotLeaf(k, group.keys[0]))
        .filter(Boolean),
    };
  });
}

/**
 * A single report column.
 *
 * Composition:
 *   Title card (header)
 *   Map card
 *   Grid of FeatureCards, positioned by { row, col }.
 *
 * The grid expands southeast as the user clicks + right / + bottom
 * affordances on existing cards. A fallback preview card shows when
 * the column has no cards at all so the user sees KPI data out of
 * the box.
 *
 * Props:
 *   columnDef                  — { type, scenario, whatif?, feature? }
 *   cards                      — [{ id, row, col, feature, plots[] }]
 *   onEditPlot(cardId, plotId)
 *   onResetPlot(cardId, plotId)
 *   onDeletePlot(cardId, plotId)
 *   onPlotReady(plotId, div)   — y-axis alignment hook
 *   onAddPlotToCard(cardId, script?)
 *   onAddCard({ targetCardId, direction, feature? })
 *   onAddColumn()              — title-card "+" handler
 *   addColumnTooltip
 */
const ReportColumn = ({
  columnDef,
  cards = [],
  style,
  onEditPlot,
  onResetPlot,
  onDeletePlot,
  onDeleteCard,
  onPlotReady,
  onAddPlotToCard,
  onAddCard,
  onAddColumn,
  addColumnTooltip = 'Add column',
}) => {
  const project = useProjectStore((s) => s.project);

  const scenario = columnDef.scenario;
  const whatif = columnDef.whatif || null;

  // Sort cards by row then col for deterministic render order.
  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.row - b.row || a.col - b.col),
    [cards],
  );

  // Minimum visible state is just title card + map card. When the
  // column has no feature cards, we show an explicit "Add a feature
  // card" button below the map so the user has a clear entry point
  // without a mock preview card cluttering the view.
  const fallbackFeature =
    columnDef.type === 'feature' ? columnDef.feature : 'demand';

  const hasCards = sortedCards.length > 0;

  // Derive the grid dimensions from card positions.
  const { rows, cols } = useMemo(() => {
    if (sortedCards.length === 0) return { rows: 1, cols: 1 };
    let maxRow = 0;
    let maxCol = 0;
    for (const c of sortedCards) {
      if (c.row > maxRow) maxRow = c.row;
      if (c.col > maxCol) maxCol = c.col;
    }
    return { rows: maxRow + 1, cols: maxCol + 1 };
  }, [sortedCards]);

  let headerText = scenario;
  if (columnDef.type === 'whatif' && columnDef.whatif) {
    headerText = `${scenario}: ${columnDef.whatif}`;
  }

  return (
    <div style={{ ...columnStyle, ...style }}>
      {/* Title card + optional "+" */}
      <div style={titleRowStyle}>
        <div style={titleCardStyle}>
          <div style={headerStyle}>{headerText}</div>
        </div>
        {onAddColumn && (
          <div className="cea-card-icon-button-container">
            <Tooltip title={addColumnTooltip} placement="bottom">
              <Button
                type="text"
                icon={<CreateNewIcon />}
                onClick={onAddColumn}
                aria-label={addColumnTooltip}
              />
            </Tooltip>
          </div>
        )}
      </div>

      <div style={mapCardStyle}>
        <MapThumbnail project={project} scenario={scenario} />
      </div>

      {/* Cards grid. Rows × cols pulled from card positions. */}
      {!hasCards ? (
        onAddCard && (
          <div style={addFirstCardRowStyle}>
            <Dropdown
              menu={{
                items: buildPlotMenuItems((feature, script) =>
                  onAddCard({
                    targetCardId: null,
                    direction: null,
                    feature,
                    script,
                  }),
                ),
              }}
              trigger={['click']}
              placement="bottomLeft"
            >
              <div className="cea-card-icon-button-container">
                <Tooltip title="Add a Feature card" placement="bottom">
                  <Button
                    type="text"
                    icon={<CreateNewIcon />}
                    aria-label="Add a feature card"
                  />
                </Tooltip>
              </div>
            </Dropdown>
          </div>
        )
      ) : (
        <div
          style={{
            ...gridStyle,
            gridTemplateRows: `repeat(${rows}, auto)`,
            // `auto` columns size to their own content (each card's
            // resized width) so a wider card doesn't stretch its
            // siblings. `1fr` would force them to share the grid's
            // total width, which defeats independent resizing.
            gridTemplateColumns: `repeat(${cols}, auto)`,
          }}
        >
          {sortedCards.map((card) => (
            <div
              key={card.id}
              style={{
                gridRow: card.row + 1,
                gridColumn: card.col + 1,
              }}
            >
              <FeatureCard
                card={card}
                project={project}
                scenario={scenario}
                whatif={whatif}
                onEditPlot={(plotId) => onEditPlot?.(card.id, plotId)}
                onResetPlot={(plotId) => onResetPlot?.(card.id, plotId)}
                onDeletePlot={
                  onDeletePlot
                    ? (plotId) => onDeletePlot(card.id, plotId)
                    : undefined
                }
                onAddPlot={
                  onAddPlotToCard
                    ? (script) => onAddPlotToCard(card.id, script)
                    : undefined
                }
                onAddCardRight={
                  onAddCard
                    ? () =>
                        onAddCard({
                          targetCardId: card.id,
                          direction: 'right',
                        })
                    : undefined
                }
                onAddCardBottom={
                  onAddCard
                    ? () =>
                        onAddCard({
                          targetCardId: card.id,
                          direction: 'bottom',
                        })
                    : undefined
                }
                onDeleteCard={
                  onDeleteCard ? () => onDeleteCard(card.id) : undefined
                }
                onPlotReady={onPlotReady}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const columnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  // Each card owns its own size — dragging one card's resize handle
  // must not stretch or shrink its siblings. `flex-start` stops the
  // default cross-axis `stretch` so children size to themselves.
  alignItems: 'flex-start',
};

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

// Shared minimums — every card in the column inherits this floor so
// they stay visually consistent at launch and when the user drags a
// card's resize handle. Feature cards (in FeatureCard.jsx) share the
// same minWidth value via their own cardStyle.
const CARD_MIN_WIDTH = 500;
const CARD_MIN_HEIGHT = 280;

// The title card is an exception to the shared minimum floor — it
// holds only a scenario name, so it sizes to its text rather than
// matching the map / feature cards' 320×160 floor.
const titleCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '10px 16px',
  boxSizing: 'border-box',
  resize: 'both',
  overflow: 'hidden',
  minWidth: 200,
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
};

const headerStyle = {
  fontSize: 22,
  fontWeight: 700,
  color: '#222',
  lineHeight: 1.2,
};

const mapCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  overflow: 'hidden',
  boxSizing: 'border-box',
  resize: 'both',
  minWidth: CARD_MIN_WIDTH,
  minHeight: CARD_MIN_HEIGHT,
  height: 280,
};

const gridStyle = {
  display: 'grid',
  gap: 16,
  // Grid cells don't stretch their content — each card sits at its
  // own resized size, not at the cell's size. Combined with `auto`
  // tracks, this means a wider/taller card doesn't drag siblings
  // with it.
  justifyItems: 'start',
  alignItems: 'start',
};

// Row that holds the "Add a feature card" button when no feature
// cards exist yet. Aligned under the map card (start of the row) so
// the call-to-action is predictable.
const addFirstCardRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

export default ReportColumn;

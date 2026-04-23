import { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import { CreateNewIcon } from 'assets/icons';

import { useProjectStore } from 'features/project/stores/projectStore';
import MapThumbnail from './MapThumbnail';
import FeatureCard from './FeatureCard';

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

  // Fallback preview when the column has no cards yet. A "ghost" card
  // that shows KPIs for the default feature so the user sees the grid
  // intent immediately. It's not in state — picking a plot here
  // commits a real card at (0, 0).
  const fallbackFeature =
    columnDef.type === 'feature' ? columnDef.feature : 'demand';

  const showFallback = sortedCards.length === 0;

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
      {showFallback ? (
        <FeatureCard
          card={{
            id: 'fallback',
            row: 0,
            col: 0,
            feature: fallbackFeature,
            plots: [],
          }}
          project={project}
          scenario={scenario}
          whatif={whatif}
          onAddPlot={
            onAddCard
              ? (script) =>
                  onAddCard({
                    targetCardId: null,
                    direction: null,
                    feature: fallbackFeature,
                    script,
                  })
              : undefined
          }
          // Fallback card also gets + edges so the affordance is visible
          // from the empty state. Both directions go to the same place
          // (create the first card at 0,0) since there's nothing to sit
          // next to yet.
          onAddCardRight={
            onAddCard
              ? () =>
                  onAddCard({
                    targetCardId: null,
                    direction: null,
                    feature: fallbackFeature,
                  })
              : undefined
          }
          onAddCardBottom={
            onAddCard
              ? () =>
                  onAddCard({
                    targetCardId: null,
                    direction: null,
                    feature: fallbackFeature,
                  })
              : undefined
          }
          onPlotReady={onPlotReady}
        />
      ) : (
        <div
          style={{
            ...gridStyle,
            gridTemplateRows: `repeat(${rows}, auto)`,
            gridTemplateColumns: `repeat(${cols}, minmax(280px, 1fr))`,
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
};

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const titleCardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '10px 16px',
  resize: 'both',
  overflow: 'hidden',
  minWidth: 240,
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
  resize: 'both',
  minWidth: 240,
  minHeight: 120,
  height: 200,
};

const gridStyle = {
  display: 'grid',
  gap: 16,
};

export default ReportColumn;

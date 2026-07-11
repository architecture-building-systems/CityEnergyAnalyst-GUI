import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';

import { PLOT_LABELS, VIEW_PLOT_RESULTS } from 'features/plots/constants';
// `cea-template-select` — same pill used by the pathway builder.
import 'features/project/components/Cards/OverviewCard/OverviewCard.css';

import PlotSlotCard from './PlotSlotCard';
import { useCanvasStore } from '../stores/canvasStore';
import { FeatureCardShell } from './FeatureCardShell';
import {
  findFamilyForFeature,
  sectionDividerStyle,
} from '../utils/featureFamily';

/**
 * Plot-only feature card: vertically-stacked plots + an "Add a plot"
 * pill. Sizing owned by the parent `react-grid-layout` tile.
 *
 * Props:
 *   card             — { id, feature, plots }
 *   project, scenarioContext — passed through to PlotSlotCard for per-column header targeting
 *   onEditPlot(plotId), onDeletePlot(plotId)
 *   onAddPlot(script?)              — add a plot to this card
 *   onDeleteCard()
 *   onPlotReady(plotId, plotDiv)    — y-axis alignment hook
 *   onPreferredHeight(cardId, totalPx) — fires when plots report
 *     their natural height; parent grows card.h to fit.
 */
const FeatureCardPlot = ({
  card,
  project,
  scenarioContext,
  onEditPlot,
  onDeletePlot,
  onAddPlot,
  onDeleteCard,
  onPlotReady,
  onPreferredHeight,
  editing = false,
}) => {
  const { feature, plots } = card;

  // Per-plot natural-height aggregation: each PlotSlotCard reports
  // its chart's backend-baked pixel height (or nothing, for plots
  // that autosize). Sum + chrome → `onPreferredHeight` so the
  // column can grow `card.h` to fit on first render.
  const [plotHeights, setPlotHeights] = useState({});
  const handleNaturalHeight = useCallback(
    (plotId) => (heightPx) =>
      setPlotHeights((prev) =>
        prev[plotId] === heightPx ? prev : { ...prev, [plotId]: heightPx },
      ),
    [],
  );
  useEffect(() => {
    const measured = Object.values(plotHeights);
    if (measured.length === 0 || !onPreferredHeight) return;
    const total = measured.reduce((a, b) => a + b, 0) + CARD_CHROME_PX;
    onPreferredHeight(card.id, total);
  }, [plotHeights, card.id, onPreferredHeight]);

  const quickPickOptions = getQuickPickOptions(feature);
  const family = useMemo(() => findFamilyForFeature(feature), [feature]);

  // Hide the "Add a plot" pill when Canvas Builder's Enable Edit
  // toggle is off (snapshot mode).
  const enableEdit = useCanvasStore((s) => s.enableEdit);

  return (
    <FeatureCardShell
      title={family?.label || feature}
      icon={family?.icon}
      onDeleteCard={onDeleteCard}
      editing={editing}
    >
      {(plots.length > 0 || onAddPlot) && (
        <>
          <div style={sectionDividerStyle} />
          <div style={plotsSectionStyle}>
            {plots.map((plot, idx) => (
              <Fragment key={plot.id}>
                {idx > 0 && <div style={plotDividerStyle} />}
                <PlotSlotCard
                  project={project}
                  scenarioContext={scenarioContext}
                  plotConfig={plot.plotConfig}
                  onEdit={() => onEditPlot?.(plot.id)}
                  onDelete={
                    onDeletePlot ? () => onDeletePlot(plot.id) : undefined
                  }
                  onPlotReady={
                    onPlotReady
                      ? (plotDiv) => onPlotReady(plot.id, plotDiv)
                      : undefined
                  }
                  onNaturalHeight={handleNaturalHeight(plot.id)}
                />
              </Fragment>
            ))}
            {onAddPlot && enableEdit && (
              <div
                style={
                  plots.length > 0 ? addPlotRowWithDividerStyle : undefined
                }
              >
                <AddPlotSelect
                  options={quickPickOptions}
                  onPick={(script) => onAddPlot(script)}
                  onFallback={() => onAddPlot()}
                />
              </div>
            )}
          </div>
        </>
      )}
    </FeatureCardShell>
  );
};

function getQuickPickOptions(feature) {
  const family = findFamilyForFeature(feature);
  const keys = family?.keys || [];
  return keys
    .map((key) => {
      const script = VIEW_PLOT_RESULTS[key];
      if (!script) return null;
      return { key, script, label: PLOT_LABELS[key] || key };
    })
    .filter(Boolean);
}

const AddPlotSelect = ({ options, onPick, onFallback }) => {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const hasOptions = options.length > 0;

  return (
    <Select
      key={resetKey}
      className={`cea-template-select ${
        hasOptions ? '' : 'cea-select-empty cea-select-glow'
      }`}
      style={{ width: 208 }}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder="Add a plot"
      options={options.map((opt) => ({ label: opt.label, value: opt.script }))}
      value={null}
      onSelect={(script) => {
        onPick(script);
        setOpen(false);
        setResetKey((k) => k + 1);
      }}
      open={hasOptions ? open : false}
      onOpenChange={hasOptions ? setOpen : undefined}
      onClick={hasOptions ? undefined : onFallback}
      allowClear={false}
      notFoundContent={<small>No plots available</small>}
    />
  );
};

// Plot section absorbs the card's remaining height. `minHeight: 0`
// lets it shrink below its content's natural height when the user
// drags the card shorter.
const plotsSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  flex: 1,
  minHeight: 0,
};

const addPlotRowWithDividerStyle = {
  borderTop: '1px solid #f0f0f0',
  paddingTop: 8,
  marginTop: 4,
};

const plotDividerStyle = {
  borderTop: '1px solid #f0f0f0',
};

// Title row + dividers + padding + per-plot controls overhead. The
// per-plot controls (caption + Edit/Delete trio) are inside each
// PlotSlotCard but not counted in `onNaturalHeight` (which reports
// the chart only), so we add a flat allowance here. Slightly
// generous — over-estimating just lands the card a row taller.
const CARD_CHROME_PX = 120;

export default FeatureCardPlot;

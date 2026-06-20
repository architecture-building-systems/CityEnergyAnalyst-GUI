import { useRef, useState, useMemo } from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import { InputEditorIcon, BinAnimationIcon, RefreshIcon } from 'assets/icons';

import CanvasPlot, { fitPlotToParent } from './CanvasPlot';
import { useCanvasStore } from '../stores/canvasStore';

/**
 * A single plot slot within a FeatureCard. Edit / Refit / Delete
 * buttons sit above the chart in one shared icon-button container.
 */
const PlotSlotCard = ({
  scenario,
  plotConfig,
  onEdit,
  onDelete,
  onPlotReady,
  onNaturalHeight,
}) => {
  // Title lifted out of the Plotly figure by CanvasPlot — shown on
  // the controls row instead of inside the chart canvas.
  const [caption, setCaption] = useState('');

  // Manual fit escape hatch: the Refresh button below re-runs
  // `fitPlotToParent` on every Plotly figure inside this slot. The
  // automated RO + explicit-settle path catches almost everything,
  // but a button lets the user nudge a chart that ends up at the
  // wrong size after a complex resize sequence.
  const slotRef = useRef(null);
  const handleRefresh = () => {
    slotRef.current
      ?.querySelectorAll('.js-plotly-plot, .plotly-graph-div')
      .forEach((div) => fitPlotToParent(div));
  };

  // Hide the per-plot Edit / Refit / Delete trio when Canvas
  // Builder's Enable Edit toggle is off (snapshot mode).
  const enableEdit = useCanvasStore((s) => s.enableEdit);

  // Single what-if pick → append `| {name}` to the title. Multi-pick
  // stacks multiple figures with their own labels, so a single
  // suffix would mislabel them.
  const whatifSuffix = useMemo(() => {
    const list = plotConfig?.parameters?.['what-if-name'];
    if (Array.isArray(list) && list.length === 1) return list[0];
    if (typeof list === 'string' && list.trim()) return list.trim();
    return null;
  }, [plotConfig]);

  // Comma-bearing captions split into a primary title (before the
  // first comma) and a qualifier (after) — rendered on two lines so
  // long titles stay readable. Any `| whatif` suffix joins the last
  // visible row.
  const { primaryTitle, secondaryTitle } = useMemo(() => {
    if (!caption) return { primaryTitle: '', secondaryTitle: '' };
    const idx = caption.indexOf(',');
    if (idx === -1) return { primaryTitle: caption, secondaryTitle: '' };
    return {
      primaryTitle: caption.slice(0, idx).trim(),
      secondaryTitle: caption.slice(idx + 1).trim(),
    };
  }, [caption]);

  const hoverTitle = caption
    ? whatifSuffix
      ? `${caption} | ${whatifSuffix}`
      : caption
    : '';

  const secondaryLine = secondaryTitle
    ? whatifSuffix
      ? { text: secondaryTitle, suffix: whatifSuffix }
      : { text: secondaryTitle, suffix: null }
    : whatifSuffix
      ? { text: null, suffix: whatifSuffix }
      : null;

  return (
    <div ref={slotRef} style={slotStyle}>
      <div style={controlsStyle}>
        <div style={titleStyle} title={hoverTitle}>
          {primaryTitle && (
            <div style={titleRowStyle}>
              <span style={titleTextStyle}>{primaryTitle}</span>
            </div>
          )}
          {secondaryLine && (
            <div style={titleRowSecondaryStyle}>
              {secondaryLine.text && (
                <span style={titleTextStyle}>{secondaryLine.text}</span>
              )}
              {secondaryLine.text && secondaryLine.suffix && (
                <span style={titleSeparatorStyle}>|</span>
              )}
              {secondaryLine.suffix && (
                <span style={titleTextStyle}>{secondaryLine.suffix}</span>
              )}
            </div>
          )}
        </div>
        {enableEdit && (
          <div className="cea-card-icon-button-container">
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<InputEditorIcon />}
                onClick={onEdit}
                aria-label="Edit plot"
              />
            </Tooltip>
            <Tooltip title="Refit">
              <Button
                type="text"
                icon={<RefreshIcon />}
                onClick={handleRefresh}
                aria-label="Refit chart to its container"
              />
            </Tooltip>
            {onDelete && (
              <Popconfirm
                title="Delete this plot?"
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={onDelete}
              >
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    icon={<BinAnimationIcon style={{ color: '#f04d5b' }} />}
                    aria-label="Delete plot"
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        )}
      </div>
      <CanvasPlot
        scenario={scenario}
        plotConfig={plotConfig}
        onPlotReady={onPlotReady}
        onCaption={setCaption}
        onNaturalHeight={onNaturalHeight}
      />
    </div>
  );
};

// `flex: 1` + `minHeight: 0` lets the inner CanvasPlot shrink when
// the user drags the card shorter. Vertical spacing between slots
// is owned by `plotsSectionStyle.gap` in FeatureCard.
const slotStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

const controlsStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 4,
};

// `minWidth: 0` is the standard fix that lets `text-overflow:
// ellipsis` actually clip inside a flex child.
const titleStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  color: '#222',
  overflow: 'hidden',
};

const titleRowStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 16,
  fontWeight: 600,
  fontSize: 14,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

const titleRowSecondaryStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  fontWeight: 400,
  fontSize: 12,
  color: '#666',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

const titleTextStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

const titleSeparatorStyle = {
  color: '#999',
  fontWeight: 400,
};

export default PlotSlotCard;

import { useState, useMemo } from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import { InputEditorIcon, RefreshIcon, BinAnimationIcon } from 'assets/icons';

import ReportPlot from './ReportPlot';

/**
 * A single plot slot within a FeatureCard.
 * Edit / Reset / Delete controls sit above the chart in one shared
 * `cea-card-icon-button-container` frame — same visual pattern as
 * the map card's top-left toolbar (see MapThumbnail.jsx).
 * Delete is guarded by a lightweight Popconfirm.
 */
const PlotSlotCard = ({
  project,
  scenario,
  feature,
  whatif,
  plotConfig,
  onEdit,
  onReset,
  onDelete,
  onPlotReady,
}) => {
  // Main title lifted out of the Plotly figure by `ReportPlot`. When
  // set, it's shown on the controls row instead of the figure canvas.
  const [caption, setCaption] = useState('');

  // Append `| {whatif}` only when the user picked exactly one what-if
  // name. Multi-selection means multiple figures stacked below with
  // their own labels, so a single suffix would be misleading.
  const whatifSuffix = useMemo(() => {
    const list = plotConfig?.parameters?.['what-if-name'];
    if (Array.isArray(list) && list.length === 1) return list[0];
    if (typeof list === 'string' && list.trim()) return list.trim();
    return null;
  }, [plotConfig]);

  // Some plot titles come back as a single string with a comma in the
  // middle (e.g. "Building Energy Demand, what-if-A"). When that
  // happens, split on the first comma and stack the halves — the
  // part before the comma is the primary title, the part after is a
  // qualifier that reads better on a second line. The `| whatif`
  // suffix joins whichever row is the last one so it stays adjacent
  // to the qualifier rather than the primary.
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
    <div style={slotStyle}>
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
        <div className="cea-card-icon-button-container">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<InputEditorIcon />}
              onClick={onEdit}
              aria-label="Edit plot"
            />
          </Tooltip>
          <Tooltip title="Reset">
            <Button
              type="text"
              icon={<RefreshIcon />}
              onClick={onReset}
              disabled={!plotConfig}
              aria-label="Reset plot"
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
      </div>
      <ReportPlot
        project={project}
        scenario={scenario}
        feature={feature}
        whatif={whatif}
        plotConfig={plotConfig}
        onPlotReady={onPlotReady}
        onCaption={setCaption}
      />
    </div>
  );
};

// No top margin on individual slots — vertical spacing between a
// plot's button row and the section divider above comes from
// `FeatureCard`'s cardStyle gap (8px). Adding an extra marginTop
// here made the first plot's trio sit further from the divider
// than the KPI trio sits from its divider. Plot-to-plot spacing
// is handled by `plotsSectionStyle.gap` in FeatureCard.
//
// `flex: 1` + column layout lets `ReportPlot` fill whatever space
// the plot section hands down. `minHeight: 0` keeps the child
// shrinkable when the user drags the card smaller — otherwise the
// plot's default height would floor the slot.
const slotStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

// Controls row now carries the title on the left and the Edit/Reset/
// Delete trio on the right. `space-between` with `align-items: center`
// keeps the two ends visually on the same baseline; `min-width: 0` on
// the title is the standard trick that makes `text-overflow: ellipsis`
// work inside a flex child.
const controlsStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 4,
};

// Title now stacks vertically so a comma-split caption can render
// as two rows — primary on top, qualifier (+ any `| whatif` suffix)
// beneath. Single-row captions collapse back to a single child.
const titleStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  color: '#222',
  overflow: 'hidden',
};

// Primary title row — unchanged styling from the single-row case.
const titleRowStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 16,
  fontWeight: 600,
  fontSize: 14,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

// Secondary row — slightly smaller and lighter so the hierarchy
// reads, and the pipe separator still has CSS-controlled breathing
// room on either side.
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

// Lighter than the title text so the separator reads as punctuation,
// not a third word.
const titleSeparatorStyle = {
  color: '#999',
  fontWeight: 400,
};

export default PlotSlotCard;

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
  return (
    <div style={slotStyle}>
      <div style={controlsStyle}>
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
const slotStyle = {};

const controlsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBottom: 4,
};

export default PlotSlotCard;

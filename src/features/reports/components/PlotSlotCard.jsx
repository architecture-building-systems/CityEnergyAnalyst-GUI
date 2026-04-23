import { Button, Space, Popconfirm, Tooltip } from 'antd';
import { InputEditorIcon, RefreshIcon, BinAnimationIcon } from 'assets/icons';

import ReportPlot from './ReportPlot';

/**
 * A single plot slot within a FeatureCard.
 * Edit / Reset / Delete controls sit above the chart.
 * Delete is guarded by a lightweight Popconfirm to prevent accidental loss.
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
        <Space size="small">
          <div className="cea-card-icon-button-container">
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<InputEditorIcon />}
                onClick={onEdit}
                aria-label="Edit plot"
              />
            </Tooltip>
          </div>
          <div className="cea-card-icon-button-container">
            <Tooltip title="Reset">
              <Button
                type="text"
                icon={<RefreshIcon />}
                onClick={onReset}
                disabled={!plotConfig}
                aria-label="Reset plot"
              />
            </Tooltip>
          </div>
          {onDelete && (
            <Popconfirm
              title="Delete this plot?"
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={onDelete}
            >
              <div className="cea-card-icon-button-container">
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    icon={<BinAnimationIcon style={{ color: '#f04d5b' }} />}
                    aria-label="Delete plot"
                  />
                </Tooltip>
              </div>
            </Popconfirm>
          )}
        </Space>
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

const slotStyle = {
  marginTop: 8,
};

const controlsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBottom: 4,
};

export default PlotSlotCard;

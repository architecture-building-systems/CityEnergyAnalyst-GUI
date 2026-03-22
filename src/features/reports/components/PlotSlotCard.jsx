import { Button, Space } from 'antd';

import ReportPlot from './ReportPlot';

/**
 * A single plot slot within a report column.
 * Shows Edit/Reset buttons above the chart.
 */
const PlotSlotCard = ({
  project,
  scenario,
  feature,
  whatif,
  plotConfig,
  onEdit,
  onReset,
  onPlotReady,
}) => {
  return (
    <div style={slotStyle}>
      <div style={controlsStyle}>
        <Space size="small">
          <Button size="small" onClick={onEdit}>
            Edit
          </Button>
          <Button size="small" onClick={onReset} disabled={!plotConfig}>
            Reset
          </Button>
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

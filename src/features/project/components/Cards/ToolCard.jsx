import { VerticalLeftOutlined } from '@ant-design/icons';
import Tool from 'features/tools/components/Tools/Tool';
import { Button } from 'antd';

import {
  useCloseToolCard,
  toolTypes,
  useToolType,
} from 'features/project/stores/tool-card';
import { BuildingEditor } from 'features/building-editor/components/building-editor';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { PlotTool } from './plot-tool';

const ToolCard = ({
  selectedTool,
  selectedPlotTool,
  onToolSelected,
  onResetTool,
}) => {
  const toolType = useToolType();
  const closeToolCard = useCloseToolCard();

  let content;
  switch (toolType) {
    case toolTypes.TOOLS:
      content = <Tool script={selectedTool} onToolSelected={onToolSelected} />;
      break;
    case toolTypes.MAP_LAYERS:
      content = (
        <PlotTool script={selectedPlotTool} onToolSelected={onToolSelected} />
      );
      break;
    case toolTypes.BUILDING_INFO:
      content = <BuildingEditor />;
      break;
    default:
      content = <div>No tool selected</div>;
  }

  return (
    <ErrorBoundary>
      <div
        style={{
          background: '#fff',

          borderRadius: 12,
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

          height: '100%',
          boxSizing: 'border-box',
          padding: 12,

          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,

            flexShrink: 0,
          }}
        >
          {toolType == toolTypes.MAP_LAYERS && selectedPlotTool != null && (
            <Button onClick={onResetTool}>Back</Button>
          )}
          <Button
            icon={<VerticalLeftOutlined />}
            onClick={closeToolCard}
            style={{ marginLeft: 'auto', padding: 12 }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>{content}</div>
      </div>
    </ErrorBoundary>
  );
};

export default ToolCard;

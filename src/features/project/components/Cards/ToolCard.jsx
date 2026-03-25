import { VerticalLeftOutlined } from '@ant-design/icons';
import Tool from 'features/tools/components/Tools/Tool';
import { Button, Form } from 'antd';

import {
  useCloseToolCard,
  toolTypes,
  useToolType,
  useSelectedTool,
  useSelectedPlotTool,
  useSelectTool,
  useToolCardStore,
} from 'features/project/stores/tool-card';
import { BuildingEditor } from 'features/building-editor/components/building-editor';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { PlotTool } from './plot-tool';

const ToolCard = ({ onPlotToolSelected }) => {
  const toolType = useToolType();
  const closeToolCard = useCloseToolCard();
  const selectedTool = useSelectedTool();
  const selectedPlotTool = useSelectedPlotTool();
  const selectTool = useSelectTool();
  const setSelectedTool = useToolCardStore((state) => state.setSelectedTool);
  const setSelectedPlotTool = useToolCardStore(
    (state) => state.setSelectedPlotTool,
  );
  const [form] = Form.useForm();

  const handleResetTool = () => {
    if (toolType === toolTypes.TOOLS) {
      setSelectedTool(null);
    } else if (toolType === toolTypes.MAP_LAYERS) {
      setSelectedPlotTool(null);
    }
  };

  let content;
  switch (toolType) {
    case toolTypes.TOOLS:
      content = (
        <Tool
          key={selectedTool}
          script={selectedTool}
          onToolSelected={selectTool}
          form={form}
        />
      );
      break;
    case toolTypes.MAP_LAYERS:
      content = (
        <PlotTool
          script={selectedPlotTool}
          onToolSelected={selectTool}
          onPlotToolSelected={onPlotToolSelected}
        />
      );
      break;
    case toolTypes.BUILDING_INFO:
      content = <BuildingEditor />;
      break;
    default:
      content = null;
  }

  return (
    <ErrorBoundary>
      <div
        className="cea-tool-card"
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
          className="cea-tool-card-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
          }}
        >
          {((toolType == toolTypes.TOOLS && selectedTool != null) ||
            (toolType == toolTypes.MAP_LAYERS && selectedPlotTool != null)) && (
            <Button onClick={handleResetTool}>Back</Button>
          )}
          <Button
            icon={<VerticalLeftOutlined />}
            onClick={closeToolCard}
            style={{ marginLeft: 'auto', padding: 12 }}
          />
        </div>

        <ErrorBoundary>
          <div
            className="cea-tool-card-content"
            style={{ minHeight: 0, flex: 1 }}
          >
            {content}
          </div>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

export default ToolCard;

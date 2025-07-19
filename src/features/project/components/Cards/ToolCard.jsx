import { VerticalLeftOutlined } from '@ant-design/icons';
import Tool from 'features/tools/components/Tools/Tool';
import { Button, ConfigProvider } from 'antd';

import {
  useCloseToolCard,
  toolTypes,
  useToolType,
} from 'features/project/stores/tool-card';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { BuildingEditor } from 'features/building-editor/components/building-editor';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';

const ToolCard = ({ selectedTool, selectedPlotTool, onToolSelected }) => {
  const toolType = useToolType();
  const closeToolCard = useCloseToolCard();

  // TODO: Move to CSS
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
          <Button
            icon={<VerticalLeftOutlined />}
            onClick={closeToolCard}
            style={{ marginLeft: 'auto', padding: 12 }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {toolType == toolTypes.TOOLS &&
            (selectedTool != null ? (
              <Tool script={selectedTool} onToolSelected={onToolSelected} />
            ) : (
              <div>No tool selected</div>
            ))}

          {toolType == toolTypes.MAP_LAYERS && (
            <ConfigProvider
              theme={{
                token: {
                  colorPrimary: PLOTS_PRIMARY_COLOR,
                },
              }}
            >
              <Tool script={selectedPlotTool} onToolSelected={onToolSelected} />
            </ConfigProvider>
          )}
          {toolType == toolTypes.BUILDING_INFO && <BuildingEditor />}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ToolCard;

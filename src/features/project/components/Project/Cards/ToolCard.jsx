import { VerticalLeftOutlined } from '@ant-design/icons';
import Tool from 'features/tools/components/Tools/Tool';
import { Button, ConfigProvider } from 'antd';

import {
  useCloseToolCard,
  toolTypes,
  useToolType,
} from 'features/project/stores/tool-card';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';

const ToolCard = ({ selectedTool, selectedPlotTool, onToolSelected }) => {
  const toolType = useToolType();
  const closeToolCard = useCloseToolCard();

  // TODO: Move to CSS
  return (
    <div
      style={{
        background: '#fff',

        borderRadius: 12,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

        display: 'flex',
        flexDirection: 'column',
        gap: 12,

        height: '100%',
        boxSizing: 'border-box',
        padding: 12,
      }}
    >
      <Button
        icon={<VerticalLeftOutlined />}
        onClick={closeToolCard}
        style={{ marginLeft: 'auto', padding: 12 }}
      />
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
      {toolType == toolTypes.BUILDING_INFO && <div>Building Info</div>}
    </div>
  );
};

export default ToolCard;

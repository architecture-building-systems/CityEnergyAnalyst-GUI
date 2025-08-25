import { Button, ConfigProvider } from 'antd';
import { GraphsIcon, InformationIcon, ToolsIcon } from 'assets/icons';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import {
  toolTypes,
  useCloseToolCard,
  useSetToolType,
  useToolType,
} from 'features/project/stores/tool-card';
import { useSelectedToolStore } from 'features/tools/stores/selected-tool';

export const ToolCardSideButtons = () => {
  const toolType = useToolType();
  const setToolType = useSetToolType();

  const selectedTool = useSelectedToolStore((state) => state.selectedTool);

  const closeToolCard = useCloseToolCard();

  return (
    <div
      className="cea-overlay-card"
      style={{
        position: 'absolute',
        top: 48,
        left: -40,

        transform: 'rotate(90deg)',
        transformOrigin: 'bottom left',

        display: 'flex',
        gap: 8,
      }}
    >
      {selectedTool != null && (
        <Button
          onClick={() =>
            toolType !== toolTypes.TOOLS
              ? setToolType(toolTypes.TOOLS)
              : closeToolCard()
          }
          color="primary"
          variant={toolType === toolTypes.TOOLS ? 'solid' : 'outlined'}
        >
          <ToolsIcon />
          Tools
        </Button>
      )}
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#7F8086',
          },
        }}
      >
        <Button
          onClick={() =>
            toolType !== toolTypes.BUILDING_INFO
              ? setToolType(toolTypes.BUILDING_INFO)
              : closeToolCard()
          }
          color="primary"
          variant={toolType === toolTypes.BUILDING_INFO ? 'solid' : 'outlined'}
        >
          <InformationIcon />
          Building Info
        </Button>
      </ConfigProvider>

      <ConfigProvider
        theme={{
          token: {
            colorPrimary: PLOTS_PRIMARY_COLOR,
          },
        }}
      >
        <Button
          onClick={() =>
            toolType !== toolTypes.MAP_LAYERS
              ? setToolType(toolTypes.MAP_LAYERS)
              : closeToolCard()
          }
          color="primary"
          variant={toolType === toolTypes.MAP_LAYERS ? 'solid' : 'outlined'}
        >
          <GraphsIcon />
          Plots
        </Button>
      </ConfigProvider>
    </div>
  );
};

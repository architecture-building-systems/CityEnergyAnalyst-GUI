import { Button, ConfigProvider } from 'antd';
import { GraphsIcon, InformationIcon } from 'assets/icons';
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
          type={toolType === toolTypes.TOOLS ? 'primary' : 'default'}
        >
          Tools
        </Button>
      )}
      <Button
        onClick={() =>
          toolType !== toolTypes.BUILDING_INFO
            ? setToolType(toolTypes.BUILDING_INFO)
            : closeToolCard()
        }
        type={toolType === toolTypes.BUILDING_INFO ? 'primary' : 'default'}
      >
        <InformationIcon />
        Building Info
      </Button>

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
          type={toolType === toolTypes.MAP_LAYERS ? 'primary' : 'default'}
        >
          <GraphsIcon />
          Plots
        </Button>
      </ConfigProvider>
    </div>
  );
};

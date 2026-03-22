import { Button, ConfigProvider } from 'antd';
import { GraphsIcon, InformationIcon, ToolsIcon } from 'assets/icons';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import {
  toolTypes,
  useToggleToolType,
  useToolType,
} from 'features/project/stores/tool-card';
import { useSelectedToolStore } from 'features/tools/stores/selected-tool';

export const ToolCardSideButtons = () => {
  const toolType = useToolType();
  const toggleToolType = useToggleToolType();

  const selectedTool = useSelectedToolStore((state) => state.selectedTool);

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
          onClick={() => toggleToolType(toolTypes.TOOLS)}
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
            colorPrimary: PLOTS_PRIMARY_COLOR,
          },
        }}
      >
        <Button
          onClick={() => toggleToolType(toolTypes.MAP_LAYERS)}
          color="primary"
          variant={toolType === toolTypes.MAP_LAYERS ? 'solid' : 'outlined'}
        >
          <GraphsIcon />
          Plots
        </Button>
      </ConfigProvider>

      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#000000',
          },
          components: {
            Button: {
              // Make shadow less prominent
              primaryShadow: '0 2px 0 rgba(0, 0, 0, 0.1)',
            },
          },
        }}
      >
        <Button
          onClick={() => toggleToolType(toolTypes.BUILDING_INFO)}
          color="primary"
          variant={toolType === toolTypes.BUILDING_INFO ? 'solid' : 'outlined'}
        >
          <InformationIcon />
          Building Info
        </Button>
      </ConfigProvider>
    </div>
  );
};

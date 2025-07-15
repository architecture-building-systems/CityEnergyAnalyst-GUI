import { Button } from 'antd';
import { InformationIcon } from 'assets/icons';
import {
  toolTypes,
  useCloseToolCard,
  useSetToolType,
  useToolType,
} from 'features/project/stores/tool-card';

export const ToolCardSideButtons = () => {
  const toolType = useToolType();
  const setToolType = useSetToolType();

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
    </div>
  );
};

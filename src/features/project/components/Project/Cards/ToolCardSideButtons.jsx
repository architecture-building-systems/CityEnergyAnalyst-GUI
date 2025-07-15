import { Button } from 'antd';
import { InformationIcon } from 'assets/icons';
import {
  toolTypes,
  useSetToolType,
  useToolType,
} from 'features/project/stores/tool-card';

export const ToolCardSideButtons = () => {
  const toolType = useToolType();
  const setToolType = useSetToolType();

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
        onClick={() => setToolType(toolTypes.TOOLS)}
        type={toolType === toolTypes.TOOLS ? 'primary' : 'default'}
      >
        Tools
      </Button>
      <Button
        onClick={() => setToolType(toolTypes.BUILDING_INFO)}
        type={toolType === toolTypes.BUILDING_INFO ? 'primary' : 'default'}
      >
        <InformationIcon />
        Building Info
      </Button>
    </div>
  );
};

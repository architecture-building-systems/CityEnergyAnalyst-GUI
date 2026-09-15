import { RightOutlined } from '@ant-design/icons';
import Tool from 'features/tools/components/Tools/Tool';
import { Button, Form, Tooltip } from 'antd';

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
import BuildingLifecycleCard from 'features/pathway/components/BuildingLifecycleCard';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { PlotTool } from './plot-tool';

// Card padding. The top is deeper than the other sides so the title has room to breathe.
const CARD_PADDING = 12;
const CARD_PADDING_TOP = 36;

// Where the collapse arrow sits, derived rather than eyeballed so it tracks the padding above.
// The content's title starts at `CARD_PADDING_TOP` plus its own 12px margin and runs ~24px,
// putting its centre 12px lower; the button container is ~38px tall, so half of that centres it
// on the same line. This only holds while every card content titles itself with the shared
// `.cea-tool-card-title` (Project.css).
const TITLE_OUTER_MARGIN = 12;
const TITLE_HALF_LINE = 12;
const COLLAPSE_BUTTON_HALF_HEIGHT = 19;
const COLLAPSE_BUTTON_TOP =
  CARD_PADDING_TOP +
  TITLE_OUTER_MARGIN +
  TITLE_HALF_LINE -
  COLLAPSE_BUTTON_HALF_HEIGHT;

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
  const buildingLifecycleData = useToolCardStore(
    (state) => state.buildingLifecycleData,
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
      content = buildingLifecycleData ? (
        <BuildingLifecycleCard
          buildingName={buildingLifecycleData.building_name}
          pathways={buildingLifecycleData.pathways}
          fixedStartYear={buildingLifecycleData.span?.start_year}
          fixedEndYear={buildingLifecycleData.span?.end_year}
        />
      ) : (
        <BuildingEditor />
      );
      break;
    default:
      content = null;
  }

  return (
    <ErrorBoundary>
      <div
        className="cea-tool-card"
        style={{
          height: '100%',
          boxSizing: 'border-box',
          padding: CARD_PADDING,
          paddingTop: CARD_PADDING_TOP,

          display: 'flex',
          flexDirection: 'column',

          // Anchors the collapse arrow below, which is taken out of flow so it can sit on the
          // content's title line rather than on a row of its own.
          position: 'relative',
        }}
      >
        {/* Only the Back button lives here now -- the collapse arrow is positioned against
            the card below. Rendered conditionally so the common case has no empty row: the
            content (and its title) must start at the card's top padding for the arrow's
            offset to line up. */}
        {toolType === toolTypes.MAP_LAYERS && selectedPlotTool != null && (
          <div
            className="cea-tool-card-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 14,
            }}
          >
            <Button onClick={handleResetTool}>Back</Button>
          </div>
        )}

        {/* Shared icon-button chrome (`cea-card-icon-button-container`, HomePage.css), the
            same as the Canvas Builder's back button and the editors' Save/Discard. The card
            is already white, so the container needs no background of its own.

            Positioned rather than placed in the header row so it lines up with the content's
            own title ("Tools" / "Plots") instead of sitting on a row above it. See
            `COLLAPSE_BUTTON_TOP` for how the offset follows the card's top padding. */}
        <Tooltip title="Collapse" placement="bottom">
          <div
            className="cea-card-icon-button-container"
            style={{
              position: 'absolute',
              top: COLLAPSE_BUTTON_TOP,
              right: CARD_PADDING,
              zIndex: 1,
            }}
          >
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={closeToolCard}
              aria-label="Collapse"
            />
          </div>
        </Tooltip>

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

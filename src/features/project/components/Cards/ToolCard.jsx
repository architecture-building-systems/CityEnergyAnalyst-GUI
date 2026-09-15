import { LeftOutlined, VerticalLeftOutlined } from '@ant-design/icons';
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

// Card padding. The top is deeper than the other sides to clear the corner arrows below and
// leave the content room to breathe under them.
const CARD_PADDING = 12;
const CARD_PADDING_TOP = 50;

// The corner arrows sit just inside the card's top corners, roughly square with the side
// padding. Independent of `CARD_PADDING_TOP`: that one sets how much air the content gets
// beneath them, and the two are tuned by eye against each other.
const CARD_ARROW_TOP = 12;

// Placement for the card's two corner arrows -- Back on the left, Collapse on the right. Same
// offset, mirrored sides, so a change to one moves both and they cannot drift apart.
//
// Both wear `cea-card-icon-button-container` (HomePage.css), the shared icon-button chrome used
// by the Canvas Builder's back button and the editors' Save/Discard; the card is already white,
// so the container needs no background of its own.
//
// Taken out of flow deliberately: in flow, the Back arrow would occupy a row of its own that
// appears and disappears with it, shifting all the content beneath.
const cardArrowStyle = (side) => ({
  position: 'absolute',
  top: CARD_ARROW_TOP,
  [side]: CARD_PADDING,
  zIndex: 1,
});

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

          // Anchors the two corner arrows below, both taken out of flow.
          position: 'relative',
        }}
      >
        {/* Back out of a specific plot, mirroring the collapse arrow opposite it. */}
        {toolType === toolTypes.MAP_LAYERS && selectedPlotTool != null && (
          <Tooltip title="Back" placement="bottom">
            <div
              className="cea-card-icon-button-container"
              style={cardArrowStyle('left')}
            >
              <Button
                type="text"
                icon={<LeftOutlined />}
                onClick={handleResetTool}
                aria-label="Back"
              />
            </div>
          </Tooltip>
        )}

        <Tooltip title="Collapse" placement="bottom">
          <div
            className="cea-card-icon-button-container"
            style={cardArrowStyle('right')}
          >
            <Button
              type="text"
              icon={<VerticalLeftOutlined />}
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

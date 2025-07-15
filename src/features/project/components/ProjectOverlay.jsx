import { useEffect, useState } from 'react';
import { useTransition, animated } from '@react-spring/web';
import OverviewCard from 'features/project/components/Project/Cards/OverviewCard/OverviewCard';
import Toolbar from 'features/project/components/Project/Cards/Toolbar/Toolbar';
import ToolCard from 'features/project/components/Project/Cards/ToolCard';
import BottomToolButtons from 'features/project/components/Project/Cards/BottomToolBottons/BottomToolButtons';
import MapControls from 'features/map/components/Map/MapControls';
import MapLayersCard from 'features/project/components/Project/Cards/MapLayersCard/MapLayersCard';
import MapLayerPropertiesCard from 'features/project/components/Project/Cards/MapLayersCard/MapLayerPropertiesCard';

import UserInfo from 'components/UserInfo';
import ShowHideCardsButton from 'components/ShowHideCardsButton';
import InputTable from './InputTable';
import {
  toolTypes,
  useToolType,
  useSetToolType,
  useCloseToolCard,
} from 'features/project/stores/tool-card';
import { useProjectStore } from 'features/project/stores/projectStore';
import { isElectron } from 'utils/electron';
import { VIEW_PLOT_RESULTS } from 'features/status-bar/components/StatusBar';
import JobInfoList from 'features/jobs/components/Jobs/JobInfoList';
import { ToolCardSideButtons } from 'features/project/components/Project/Cards/ToolCardSideButtons';
import {
  useSelectedToolStore,
  useSelectedPlotToolStore,
} from 'features/tools/stores/selected-tool';

const ProjectOverlay = ({ project, scenarioName }) => {
  const name = useProjectStore((state) => state.name);
  const scenarioList = useProjectStore((state) => state.scenariosList);

  const toolType = useToolType();
  const setToolType = useSetToolType();

  const closeToolCard = useCloseToolCard();
  const selectedTool = useSelectedToolStore((state) => state.selectedTool);
  const setSelectedTool = useSelectedToolStore(
    (state) => state.setSelectedTool,
  );
  const selectedPlotTool = useSelectedPlotToolStore(
    (state) => state.selectedPlotTool,
  );
  const setSelectedPlotTool = useSelectedPlotToolStore(
    (state) => state.setSelectedPlotTool,
  );

  const handleToolSelected = (tool) => {
    setSelectedTool(tool);
    setToolType(toolTypes.TOOLS);
  };

  const handleLayerSelected = (layer) => {
    const plotScriptName = VIEW_PLOT_RESULTS?.[layer?.name];
    if (plotScriptName) {
      setSelectedPlotTool(plotScriptName);
      setToolType(toolTypes.MAP_LAYERS);
    }
  };

  const [hideAll, setHideAll] = useState(false);
  const [showInputEditor, setInputEditor] = useState(false);
  const showToolCard = !hideAll && toolType != null;

  const handleHideAll = () => {
    setHideAll((prev) => !prev);
  };

  const tension = 150;
  const friction = 20;
  const transitionToolsFromRight = useTransition(showToolCard, {
    from: { transform: 'translateX(100%)', opacity: 0 }, // Start off-screen (right) and invisible
    enter: { transform: 'translateX(0%)', opacity: 1 }, // Slide in to the screen and become visible
    leave: { transform: 'translateX(100%)', opacity: 0 }, // Slide out to the right and fade out
    config: { tension, friction }, // Control the speed of the animation
  });

  const transitionFromLeft = useTransition(!hideAll, {
    from: { transform: 'translateX(-100%)', opacity: 0 }, // Start off-screen (left) and invisible
    enter: { transform: 'translateX(0%)', opacity: 1 }, // Slide in to the screen and become visible
    leave: { transform: 'translateX(-100%)', opacity: 0 }, // Slide out to the left and fade out
    config: { tension, friction }, // Control the speed of the animation
  });

  const transitionFromBottom = useTransition(!hideAll & showInputEditor, {
    from: { transform: 'translateY(100%)', opacity: 0 }, // Start off-screen (left) and invisible
    enter: { transform: 'translateY(0%)', opacity: 1 }, // Slide in to the screen and become visible
    leave: { transform: 'translateY(100%)', opacity: 0 }, // Slide out to the left and fade out
    config: { tension, friction }, // Control the speed of the animation
  });

  useEffect(() => {
    closeToolCard();
    setInputEditor(false);
  }, [name, scenarioName, closeToolCard]);

  return (
    <div
      id="cea-project-overlay"
      className={showToolCard ? 'show-right-sidebar' : ''}
    >
      <div id="cea-project-overlay-left-sidebar">
        {hideAll && (
          <div style={{ position: 'absolute', top: 0, left: 0, margin: 12 }}>
            <ShowHideCardsButton onToggle={handleHideAll} />
          </div>
        )}

        {transitionFromLeft((styles, item) =>
          item ? (
            <animated.div style={styles}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  height: '100%',
                  width: '100%',
                }}
              >
                <div className="cea-overlay-card">
                  <OverviewCard
                    project={project}
                    projectName={name}
                    scenarioName={scenarioName}
                    scenarioList={scenarioList}
                    onToggleHideAll={handleHideAll}
                  />
                </div>
                {!isElectron() && (
                  // FIXME: Login disabled for electron
                  <div className="cea-overlay-card">
                    <UserInfo />
                  </div>
                )}
              </div>
            </animated.div>
          ) : null,
        )}
      </div>

      <div id="cea-project-overlay-header">
        <Toolbar
          showTools={!!scenarioName}
          onToolSelected={handleToolSelected}
        />
      </div>

      <div id="cea-project-overlay-content" className="overlay-flex-column">
        <MapLayerPropertiesCard />

        {transitionFromBottom((styles, item) =>
          item ? (
            <animated.div
              className="cea-overlay-card"
              style={{
                ...styles,
                borderRadius: 12,
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

                overflow: 'auto',
                maxHeight: '30vh',
              }}
            >
              <InputTable />
            </animated.div>
          ) : null,
        )}
      </div>

      <div id="cea-project-overlay-right-sidebar">
        <ToolCardSideButtons />
        {transitionToolsFromRight((styles, item) =>
          item ? (
            <animated.div className="cea-overlay-card-full" style={styles}>
              {showToolCard ? (
                <ToolCard
                  selectedTool={selectedTool}
                  selectedPlotTool={selectedPlotTool}
                  onToolSelected={handleToolSelected}
                />
              ) : (
                // For fade out animation
                <div style={{ height: '100%', background: 'white' }}></div>
              )}
            </animated.div>
          ) : null,
        )}
      </div>

      <div id="cea-project-overlay-bottom-bar">
        <div
          style={{
            display: 'flex',
            gap: 12,
            height: 55,
            alignItems: 'center',
          }}
        >
          {!hideAll && (
            <BottomToolButtons
              onOpenInputEditor={() => setInputEditor((prev) => !prev)}
              showTools={!!scenarioName}
            />
          )}
          <div
            className="cea-overlay-card"
            // FIXME: Move to CSS
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 12,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

              boxSizing: 'border-box',
              height: '100%',

              display: 'flex',
              alignItems: 'center',

              fontSize: 12,
            }}
          >
            <MapControls />
          </div>

          <MapLayersCard onLayerSelected={handleLayerSelected} />
        </div>
      </div>

      <div id="cea-project-overlay-status">
        <JobInfoList />
      </div>
    </div>
  );
};

export default ProjectOverlay;

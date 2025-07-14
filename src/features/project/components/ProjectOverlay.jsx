import { useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import { useTransition, animated } from '@react-spring/web';
import OverviewCard from 'features/project/components/Project/Cards/OverviewCard/OverviewCard';
import Toolbar from 'features/project/components/Project/Cards/Toolbar/Toolbar';
import ToolCard from 'features/project/components/Project/Cards/ToolCard/ToolCard';
import BottomToolButtons from 'features/project/components/Project/Cards/BottomToolBottons/BottomToolButtons';
import MapControls from 'features/map/components/Map/MapControls';
import MapLayersCard from 'features/project/components/Project/Cards/MapLayersCard/MapLayersCard';
import MapLayerPropertiesCard from 'features/project/components/Project/Cards/MapLayersCard/MapLayerPropertiesCard';
import JobInfoList from 'features/jobs/components/Jobs/JobInfoList';
import UserInfo from 'components/UserInfo';
import ShowHideCardsButton from 'components/ShowHideCardsButton';
import InputTable from './InputTable';
import { useToolCardStore } from 'features/tools/stores/toolCardStore';
import { useProjectStore } from 'features/project/stores/projectStore';
import { isElectron } from 'utils/electron';
import { VIEW_PLOT_RESULTS } from 'features/status-bar/components/StatusBar';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';

const ProjectOverlay = ({ project, scenarioName }) => {
  const name = useProjectStore((state) => state.name);
  const scenarioList = useProjectStore((state) => state.scenariosList);

  const [hideAll, setHideAll] = useState(false);
  const [showInputEditor, setInputEditor] = useState(false);
  const [showVisualisation, setVisualisation] = useState(false);

  const showTools = useToolCardStore((state) => state.showTools);
  const setShowTools = useToolCardStore((state) => state.setShowTools);
  const selectedTool = useToolCardStore((state) => state.selectedTool);
  const setSelectedTool = useToolCardStore((state) => state.setVisibility);

  const handleToolSelected = (tool) => {
    setSelectedTool(tool);
    setShowTools(true);
    setVisualisation(false);
  };

  const handleLayerSelected = (layer) => {
    if (layer) {
      const plotScriptName = VIEW_PLOT_RESULTS?.[layer?.name] ?? null;
      setSelectedTool(plotScriptName);
      setVisualisation(!!plotScriptName);
      setShowTools(false);
    } else {
      setVisualisation(false);
    }
  };

  const handleHideAll = () => {
    setHideAll((prev) => !prev);
  };

  const tension = 150;
  const friction = 20;
  const transitionToolsFromRight = useTransition(!hideAll & showTools, {
    from: { transform: 'translateX(100%)', opacity: 0 }, // Start off-screen (right) and invisible
    enter: { transform: 'translateX(0%)', opacity: 1 }, // Slide in to the screen and become visible
    leave: { transform: 'translateX(100%)', opacity: 0 }, // Slide out to the right and fade out
    config: { tension, friction }, // Control the speed of the animation
  });

  const transitionVisualisationFromRight = useTransition(
    !hideAll & showVisualisation,
    {
      from: { transform: 'translateX(100%)', opacity: 0 }, // Start off-screen (right) and invisible
      enter: { transform: 'translateX(0%)', opacity: 1 }, // Slide in to the screen and become visible
      leave: { transform: 'translateX(100%)', opacity: 0 }, // Slide out to the right and fade out
      config: { tension, friction }, // Control the speed of the animation
    },
  );

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
    setShowTools(false);
    setInputEditor(false);
  }, [name, scenarioName]);

  return (
    <div id="cea-project-overlay">
      <div id="cea-project-overlay-left">
        <div id="cea-project-overlay-left-top">
          {hideAll && (
            <div style={{ position: 'absolute', top: 0, left: 0, margin: 12 }}>
              <ShowHideCardsButton onToggle={handleHideAll} />
            </div>
          )}

          {transitionFromLeft((styles, item) =>
            item ? (
              <animated.div
                style={{
                  ...styles,
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  gap: 12,
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div
                    className="cea-overlay-card"
                    style={{
                      // TODO: Make this dynamic
                      // height: '33vh',
                      minWidth: 280,
                      width: '15vw',
                    }}
                  >
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
                <Toolbar
                  showTools={!!scenarioName}
                  onToolSelected={handleToolSelected}
                />
              </animated.div>
            ) : null,
          )}
        </div>
        <div id="cea-project-overlay-left-bottom">
          <MapLayerPropertiesCard />
          {transitionFromBottom((styles, item) =>
            item ? (
              <animated.div
                className="cea-overlay-card"
                style={{
                  ...styles,
                  borderRadius: 12,
                  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

                  // TODO: Make this dynamic
                  maxHeight: '30vh',
                  overflow: 'auto',

                  flexGrow: 1,
                }}
              >
                <InputTable />
              </animated.div>
            ) : null,
          )}

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
      </div>
      <div id="cea-project-overlay-right">
        <div id="cea-project-overlay-right-top">
          {transitionToolsFromRight((styles, item) =>
            item ? (
              <animated.div
                className="cea-overlay-card"
                style={{
                  ...styles,

                  width: '33vw',
                  minWidth: 450,
                  height: '100%', // Make it full height
                }}
              >
                {showTools ? (
                  <ToolCard
                    className="cea-overlay-card"
                    selectedTool={selectedTool}
                    onClose={() => setShowTools(false)}
                    onToolSelected={handleToolSelected}
                  />
                ) : (
                  <div style={{ height: '100%', background: 'white' }}></div>
                )}
              </animated.div>
            ) : null,
          )}

          {transitionVisualisationFromRight((styles, item) =>
            item ? (
              <animated.div
                className="cea-overlay-card"
                style={{
                  ...styles,

                  width: '33vw',
                  minWidth: 450,
                  height: '100%', // Make it full height
                }}
              >
                <ConfigProvider
                  theme={{
                    token: {
                      colorPrimary: PLOTS_PRIMARY_COLOR,
                    },
                  }}
                >
                  {showVisualisation && selectedTool ? (
                    <ToolCard
                      className="cea-overlay-card"
                      selectedTool={selectedTool}
                      onClose={() => setVisualisation(false)}
                      onToolSelected={handleToolSelected}
                    />
                  ) : (
                    <div style={{ height: '100%', background: 'white' }}></div>
                  )}
                </ConfigProvider>
              </animated.div>
            ) : null,
          )}
        </div>
        <div id="cea-project-overlay-right-bottom"></div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',

          height: '33vh',
          width: '33vw',
          minWidth: 450,

          position: 'absolute',
          bottom: 0,
          right: 0,

          margin: 12,
        }}
      >
        <JobInfoList />
      </div>
    </div>
  );
};

export default ProjectOverlay;

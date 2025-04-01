import DeckGLMap from '../components/Map/Map';
import OverviewCard from '../components/Project/Cards/OverviewCard/OverviewCard';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ConfigProvider, message, Spin, Tabs, Tooltip } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import Table from '../components/InputEditor/Table';
import Toolbar from '../components/Project/Cards/Toolbar/Toolbar';
import ToolCard from '../components/Project/Cards/ToolCard/ToolCard';

import './Project.css';
import BottomToolButtons from '../components/Project/Cards/BottomToolBottons/BottomToolButtons';
import { useTransition, animated } from '@react-spring/web';
import { ShowHideCardsIcon } from '../assets/icons';
import { useHoverGrow } from '../components/Project/Cards/OverviewCard/hooks';
import MapControls from '../components/Map/MapControls';
import MapLayersCard from '../components/Project/Cards/MapLayersCard/MapLayersCard';
import { useToolStore } from '../components/Tools/store';
import MapLayerPropertiesCard from '../components/Project/Cards/MapLayersCard/MapLayerPropertiesCard';
import { useProjectStore } from '../components/Project/store';
import { useInputs } from '../hooks/queries/useInputs';
import { useMapStore } from '../components/Map/store/store';
import JobInfoList from '../components/Jobs/JobInfoList';
import RecentProjects from '../components/Project/RecentProjects';
import UserInfo from '../components/User/UserInfo';
import { isElectron } from '../utils/electron';
import { VIEW_PLOT_RESULTS } from '../components/StatusBar/StatusBar';

const Project = () => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);

  return (
    <div style={{ height: '100%', background: '#f0f2f8' }}>
      <ProjectOverlay project={project} scenarioName={scenarioName} />

      <InputMap project={project} scenario={scenarioName} />

      {!project ? <RecentProjects /> : !scenarioName && <ScenarioAlert />}
    </div>
  );
};

const ProjectOverlay = ({ project, scenarioName }) => {
  const name = useProjectStore((state) => state.name);
  const scenarioList = useProjectStore((state) => state.scenariosList);

  const [hideAll, setHideAll] = useState(false);
  const [showInputEditor, setInputEditor] = useState(false);
  const [showVisualisation, setVisualisation] = useState(false);

  const showTools = useToolStore((state) => state.showTools);
  const setShowTools = useToolStore((state) => state.setShowTools);
  const selectedTool = useToolStore((state) => state.selectedTool);
  const setSelectedTool = useToolStore((state) => state.setVisibility);

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
          {showTools &&
            transitionToolsFromRight((styles, item) =>
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
                  <ToolCard
                    className="cea-overlay-card"
                    selectedTool={selectedTool}
                    onClose={() => setShowTools(false)}
                    onToolSelected={handleToolSelected}
                  />
                </animated.div>
              ) : null,
            )}

          {showVisualisation &&
            transitionVisualisationFromRight((styles, item) =>
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
                        colorPrimary: '#ac6080',
                      },
                    }}
                  >
                    <ToolCard
                      className="cea-overlay-card"
                      selectedTool={selectedTool}
                      onClose={() => setVisualisation(false)}
                    />
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

const InputMap = ({ project, scenario }) => {
  const { data, refetch, isFetching, isError, error } = useInputs();
  const { geojsons, colors } = data;

  const [messageApi, contextHolder] = message.useMessage();
  const onError = (error) => {
    messageApi.open({
      type: 'error',
      key: 'input-map-error',
      content: `Error reading inputs for "${scenario}". (${error.message ?? 'Unknown error: Unable to fetch inputs.'})`,
      style: {
        marginTop: 120,
      },
      duration: 5,
    });
  };

  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);

  useEffect(() => {
    refetch();
    resetCameraOptions();
  }, [project, scenario]);

  useEffect(() => {
    // Only show error after retries
    if (isError && !isFetching) {
      onError(error);
    }
  }, [isError, isFetching]);

  return (
    <>
      {contextHolder}
      <div
        style={{
          height: '100%',
          position: 'relative',
          background: 'rgba(0, 0, 0, 0.05)',
        }}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      >
        {isFetching && (
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 50 }} spin />}
            tip={
              isError ? 'Error reading inputs. Retrying...' : 'Loading Inputs'
            }
            size="large"
            percent="auto"
            fullscreen
          />
        )}
        <DeckGLMap data={geojsons} colors={colors} />
      </div>
    </>
  );
};

const InputTable = () => {
  const { data } = useInputs();
  const { tables, columns } = data;

  const [tab, setTab] = useState('zone');
  const tabItems = useMemo(() => {
    if (typeof tables == 'undefined') return null;

    return [...Object.keys(tables), 'schedules'].map((key) => ({
      key: key,
      label: key,
    }));
  }, [tables]);

  if (typeof tables == 'undefined') return null;

  return (
    <div
      className="cea-input-editor"
      style={{ height: '100%', padding: '0 12px', background: '#fff' }}
    >
      <Tabs
        className="cea-input-editor-tabs"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: '#fff',
          paddingTop: 12,
        }}
        size="small"
        type="card"
        activeKey={tab}
        onChange={setTab}
        animated={false}
        items={tabItems}
      />
      <div
        className="cea-input-editor-table"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '0 12px',
          background: '#fff',
          paddingBottom: 12,
        }}
      >
        <Table tab={tab} tables={tables} columns={columns} />
      </div>
    </div>
  );
};

const ScenarioAlert = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        userSelect: 'none',
      }}
    >
      <Alert message="Create or select a Scenario to start" type="info" />
    </div>
  );
};

export const ShowHideCardsButton = ({ hideAll, onToggle, style }) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  return (
    <Tooltip
      title={!hideAll ? 'Show Overlays' : 'Hide Overlays'}
      overlayInnerStyle={{ fontSize: 12 }}
    >
      <animated.div
        className="cea-overlay-card"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={styles}
      >
        <ShowHideCardsIcon
          className="cea-card-toolbar-icon"
          style={{ margin: 0, background: '#000', ...style }}
          onClick={() => onToggle?.((prev) => !prev)}
        />
      </animated.div>
    </Tooltip>
  );
};

export default Project;

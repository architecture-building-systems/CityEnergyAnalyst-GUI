import { useDispatch, useSelector } from 'react-redux';
import DeckGLMap from '../components/Map/Map';
import OverviewCard from '../components/Project/Cards/OverviewCard/OverviewCard';
import { useEffect, useState } from 'react';
import { fetchInputData, resetInputData } from '../actions/inputEditor';
import { Alert, Spin, Tabs, Tooltip } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import Table from '../components/InputEditor/Table';
import Toolbar from '../components/Project/Cards/Toolbar/Toolbar';
import ToolCard from '../components/Project/Cards/ToolCard/ToolCard';

import './Project.css';
import BottomToolButtons from '../components/Project/Cards/BottomToolBottons/BottomToolButtons';
import { useTransition, animated } from '@react-spring/web';
import { ShowHideCardsIcon } from '../assets/icons';
import { useHoverGrow } from '../components/Project/Cards/OverviewCard/hooks';

const Project = () => {
  const { scenario_name: scenarioName } = useSelector(
    (state) => state.project.info,
  );

  return (
    <div style={{ height: '100%', background: '#f0f2f8' }}>
      <ProjectOverlay />

      <InputMap />

      {!scenarioName && <ScenarioAlert />}
    </div>
  );
};

const ProjectOverlay = () => {
  const dispatch = useDispatch();

  const {
    project,
    project_name: projectName,
    scenario_name: scenarioName,
    scenarios_list: scenarioList,
  } = useSelector((state) => state.project.info);

  const [hideAll, setHideAll] = useState(false);
  const [selectedTool, setSelectedTool] = useState();
  const [showInputEditor, setInputEditor] = useState(false);
  const [showTools, setShowTools] = useState(false);

  const handleToolSelected = (tool) => {
    setSelectedTool(tool);
    setShowTools(true);
  };

  const handleHideAll = () => {
    setHideAll((prev) => !prev);
  };

  const tension = 150;
  const friction = 20;
  const transitionFromRight = useTransition(!hideAll & showTools, {
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
    setShowTools(false);
    setInputEditor(false);
  }, [projectName, scenarioName]);

  useEffect(() => {
    if (scenarioName !== null) dispatch(fetchInputData());
    // Reset input data state on umount
    return () => {
      dispatch(resetInputData());
    };
  }, [dispatch, projectName, scenarioName]);

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
                  className="cea-overlay-card"
                  style={{
                    // TODO: Make this dynamic
                    height: '33vh',
                    minWidth: 250,
                    width: '15vw',
                  }}
                >
                  <OverviewCard
                    project={project}
                    projectName={projectName}
                    scenarioName={scenarioName}
                    scenarioList={scenarioList}
                    onToggleHideAll={handleHideAll}
                  />
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

          {!hideAll && (
            <BottomToolButtons
              onOpenInputEditor={() => setInputEditor((prev) => !prev)}
              showTools={!!scenarioName}
            />
          )}
        </div>
      </div>
      <div id="cea-project-overlay-right">
        {transitionFromRight((styles, item) =>
          item ? (
            <animated.div
              className="cea-overlay-card"
              style={{
                ...styles,
                height: '100%',
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
      </div>
    </div>
  );
};

const InputMap = () => {
  const { status } = useSelector((state) => state.inputData);
  const { geojsons, colors } = useSelector((state) => state.inputData);

  return (
    <>
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
        {status == 'fetching' && (
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 50 }} spin />}
            tip="Loading Inputs"
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
  const tables = useSelector((state) => state.inputData.tables);
  const [tab, setTab] = useState('zone');

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
        items={[...Object.keys(tables), 'schedules'].map((key) => ({
          key: key,
          label: key,
        }))}
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
        <Table tab={tab} />
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

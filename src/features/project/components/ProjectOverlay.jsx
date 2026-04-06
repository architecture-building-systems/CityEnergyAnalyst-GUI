import { useEffect, useRef, useState } from 'react';
import { useTransition, animated } from '@react-spring/web';
import OverviewCard from 'features/project/components/Cards/OverviewCard/OverviewCard';
import Toolbar from 'features/project/components/Cards/Toolbar/Toolbar';
import ToolCard from 'features/project/components/Cards/ToolCard';
import BottomToolButtons from 'features/project/components/Cards/BottomToolBottons/BottomToolButtons';
import MapControls from 'features/map/components/Map/MapControls';
import MapLayerCategoriesCard from 'features/project/components/Cards/MapLayersCard/MapLayersCard';
import MapLayerPropertiesCard from 'features/project/components/Cards/MapLayersCard/MapLayerPropertiesCard';
import PathwayPanel from 'features/pathway/components/PathwayPanel';

import UserInfo from 'components/UserInfo';
import ShowHideCardsButton from 'components/ShowHideCardsButton';
import InputTable from './InputTable';
import {
  toolTypes,
  useToolCardStore,
  useToolType,
  useSetToolType,
  useSelectPlotTool,
} from 'features/project/stores/tool-card';
import useJobsStore from 'features/jobs/stores/jobsStore';
import { useProjectStore } from 'features/project/stores/projectStore';
import { VIEW_PLOT_RESULTS } from 'features/plots/constants';
import JobInfoList from 'features/jobs/components/Jobs/JobInfoList';
import { ToolCardSideButtons } from 'features/project/components/Cards/ToolCardSideButtons';
import {
  useResetSelected,
  useSelected,
  useSelectionSource,
} from 'features/input-editor/stores/inputEditorStore';
import { InputChangesCard } from './Cards/input-changes-card';
import { isElectron } from 'utils/electron';
import {
  useMapLayerCategories,
  useSetActiveMapCategory,
} from './Cards/MapLayersCard/store';
import { useSetSelectedMapLayer } from 'features/map/stores/mapStore';
import ConstructionStandardLegend from 'features/map/components/Map/Layers/ConstructionStandardLegend';

const ProjectOverlay = ({ project, scenarioName }) => {
  const name = useProjectStore((state) => state.name);
  const scenarioList = useProjectStore((state) => state.scenariosList);

  const toolType = useToolType();
  const setToolType = useSetToolType();
  const selectPlotTool = useSelectPlotTool();

  const resetSelected = useResetSelected();
  const selectedBuildings = useSelected();
  const selectionSource = useSelectionSource();
  const setSelectedTool = useToolCardStore((state) => state.setSelectedTool);
  const mapLayerCategories = useMapLayerCategories();
  const setActiveMapCategory = useSetActiveMapCategory();
  const setSelectedLayer = useSetSelectedMapLayer();

  const handlePlotToolSelected = (tool) => {
    // Get map layer category from plot script name
    const layer = Object.keys(VIEW_PLOT_RESULTS).find(
      (key) => VIEW_PLOT_RESULTS[key] === tool,
    );
    const category = mapLayerCategories?.categories?.find((cat) =>
      cat.layers.find((l) => l.name === layer),
    );
    if (category) {
      setActiveMapCategory(category.name);
      setSelectedLayer(layer);
    }

    selectPlotTool(tool);
  };

  const handleCategorySelected = (category) => {
    // Chose the first layer in the category by default
    const firstLayer = category?.layers?.[0];
    if (firstLayer) {
      handleLayerSelected(firstLayer.name);
    }
  };

  const handleLayerSelected = (layer) => {
    const plotScriptName = VIEW_PLOT_RESULTS?.[layer] ?? null;

    useToolCardStore.getState().setSelectedPlotTool(plotScriptName);
    if (plotScriptName) setToolType(toolTypes.MAP_LAYERS);
  };

  const [hideAll, setHideAll] = useState(false);
  const [showInputEditor, setInputEditor] = useState(false);
  const [showPathwayPanel, setShowPathwayPanel] = useState(false);
  const pathwayPanelHiddenForToolRef = useRef(false);
  const [pathwayPanelExpanded, setPathwayPanelExpanded] = useState(false);
  const [pathwayPanelHeight, setPathwayPanelHeight] = useState(360);
  const pathwayResizeStateRef = useRef(null);
  const pathwayPanelContentRef = useRef(null);

  const showToolBar = scenarioName != null && !hideAll;
  const showToolCardSideButtons = scenarioName != null && !hideAll;
  const showToolCard = scenarioName != null && !hideAll && toolType != null;

  useEffect(() => {
    if (!showToolCard && pathwayPanelHiddenForToolRef.current) {
      pathwayPanelHiddenForToolRef.current = false;
      setShowPathwayPanel(true);
    }
  }, [showToolCard]);

  // Watch for building events job completion to close tool card
  const jobs = useJobsStore((state) => state.jobs);
  const buildingEventsHandledRef = useRef(new Set());

  useEffect(() => {
    if (!jobs || !pathwayPanelHiddenForToolRef.current) {
      return;
    }

    const completedJobs = Object.entries(jobs)
      .filter(
        ([id, job]) =>
          job.state === 2 &&
          job.script === 'pathway-update-building-events' &&
          !buildingEventsHandledRef.current.has(id),
      );

    if (completedJobs.length > 0) {
      completedJobs.forEach(([id]) => buildingEventsHandledRef.current.add(id));
      setToolType(null);
    }
  }, [jobs, setToolType]);

  const fullscreenPathwayPanelRightInset = showToolCard
    ? 'calc(var(--right-sidebar-width) + 56px)'
    : 12;

  const closeInputEditor = () => {
    setInputEditor(false);
  };

  const toggleInputEditor = () => {
    setInputEditor((prev) => {
      const next = !prev;
      if (next) {
        setShowPathwayPanel(false);
        setPathwayPanelExpanded(false);
      }
      return next;
    });
  };

  const togglePathwayPanel = () => {
    setShowPathwayPanel((prev) => {
      const next = !prev;
      if (next) {
        setInputEditor(false);
      } else {
        setPathwayPanelExpanded(false);
      }
      return next;
    });
  };

  const handleHideAll = () => {
    setHideAll((prev) => {
      const next = !prev;
      if (next) {
        setPathwayPanelExpanded(false);
      }
      return next;
    });
  };

  useEffect(() => {
    const clampHeight = (height) =>
      Math.max(360, Math.min(height, window.innerHeight - 220));

    const handleResize = () => {
      setPathwayPanelHeight((current) => clampHeight(current));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const resizeState = pathwayResizeStateRef.current;
      if (!resizeState) {
        return;
      }

      const contentHeight = pathwayPanelContentRef.current?.scrollHeight ?? Infinity;
      const nextHeight = Math.max(
        360,
        Math.min(
          resizeState.startHeight - (event.clientY - resizeState.startY),
          window.innerHeight - 220,
          contentHeight + 18,
        ),
      );
      setPathwayPanelHeight(nextHeight);
    };

    const handlePointerUp = () => {
      pathwayResizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, []);

  const handlePathwayResizeStart = (event) => {
    if (pathwayPanelExpanded || event.button !== 0) {
      return;
    }

    pathwayResizeStateRef.current = {
      startY: event.clientY,
      startHeight: pathwayPanelHeight,
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
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

  const inputTableTransition = useTransition(!hideAll && showInputEditor, {
    from: { transform: 'translateY(100%)', opacity: 0, maxHeight: '0vh' }, // Start off-screen (left) and invisible
    enter: {
      transform: 'translateY(0%)',
      opacity: 1,
      maxHeight: '40vh',
      marginBlock: '0px',
    }, // Slide in to the screen and become visible
    leave: {
      transform: 'translateY(100%)',
      opacity: 0,
      maxHeight: '0vh',
      marginBlock: '-12px', // To account for container padding and flex gap before it is removed
    }, // Slide out to the left and fade out
    config: { tension, friction }, // Control the speed of the animation
  });

  const pathwayPanelTransition = useTransition(!hideAll && showPathwayPanel, {
    from: { transform: 'translateY(100%)', opacity: 0, maxHeight: '0vh' },
    enter: {
      transform: 'translateY(0%)',
      opacity: 1,
      maxHeight: pathwayPanelExpanded
        ? 'calc(100vh - 152px)'
        : `${pathwayPanelHeight}px`,
      marginBlock: '0px',
    },
    leave: {
      transform: 'translateY(100%)',
      opacity: 0,
      maxHeight: '0vh',
      marginBlock: '-12px',
    },
    config: { tension, friction },
  });

  const transitionFromTop = useTransition(showToolBar, {
    from: { transform: 'translateY(-100%)', opacity: 0 }, // Start off-screen (top) and invisible
    enter: { transform: 'translateY(0%)', opacity: 1 }, // Slide in from top and become visible
    leave: { transform: 'translateY(-100%)', opacity: 0 }, // Slide out to top and fade out
    config: { tension, friction }, // Control the speed of the animation
  });

  // Reset state when project or scenario name changes
  useEffect(() => {
    const resetState = () => {
      setToolType(null);
      setSelectedTool(null);

      resetSelected();
      setInputEditor(false);
      setShowPathwayPanel(false);
      setPathwayPanelExpanded(false);
    };

    resetState();
  }, [name, scenarioName]);

  useEffect(() => {
    // Show building info tool card when buildings are selected on map and input editor is not open
    if (
      selectedBuildings.length > 0 &&
      selectionSource === 'map' &&
      !showInputEditor
    ) {
      setToolType(toolTypes.BUILDING_INFO);
    }
  }, [selectedBuildings, selectionSource, setToolType]);

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

                {`${import.meta.env.VITE_AUTH_URL}` && !isElectron() ? (
                  // FIXME: Login disabled for electron
                  <div className="cea-overlay-card">
                    <UserInfo />
                  </div>
                ) : null}

                <InputChangesCard />
              </div>
            </animated.div>
          ) : null,
        )}
      </div>

      <div id="cea-project-overlay-header">
        {transitionFromTop((styles, item) =>
          item ? (
            <animated.div style={styles}>
              <Toolbar />
            </animated.div>
          ) : null,
        )}
      </div>

      <div
        className="cea-overlay-card"
        style={{
          gridColumn: '1',
          gridRow: '2',
          alignSelf: 'end',
        }}
      >
        <ConstructionStandardLegend />
      </div>

      <div id="cea-project-overlay-content" className="overlay-flex-column">
        <MapLayerPropertiesCard onLayerSelect={handleLayerSelected} />

        {inputTableTransition((styles, item) =>
          item ? (
            <animated.div
              className="cea-overlay-card"
              style={{
                ...styles,
                paddingInline: 12,
                paddingBottom: 12,
                borderRadius: 12,
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

                background: '#fff',
                // maxHeight: '40vh',
              }}
            >
              <InputTable onClose={closeInputEditor} />
            </animated.div>
          ) : null,
        )}

        {pathwayPanelTransition((styles, item) =>
          item ? (
            <animated.div
              className="cea-overlay-card"
              style={{
                ...styles,
                overflow: 'hidden',
                borderRadius: 20,
                boxShadow: '0 24px 54px rgba(15, 23, 42, 0.16)',
                background: 'rgba(255, 255, 255, 0.94)',
                display: 'flex',
                flexDirection: 'column',
                height: pathwayPanelExpanded ? 'auto' : pathwayPanelHeight,
                maxHeight: pathwayPanelExpanded
                  ? 'calc(100vh - 152px)'
                  : pathwayPanelHeight,
                zIndex: 10,
                ...(pathwayPanelExpanded
                  ? {
                      position: 'fixed',
                      top: 64,
                      right: fullscreenPathwayPanelRightInset,
                      bottom: 96,
                      left: 12,
                      maxHeight: 'none',
                      zIndex: 1400,
                    }
                  : null),
              }}
            >
              {!pathwayPanelExpanded ? (
                <button
                  type="button"
                  aria-label="Resize pathway panel"
                  onMouseDown={handlePathwayResizeStart}
                  style={{
                    height: 18,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'ns-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flex: '0 0 auto',
                  }}
                >
                  <span
                    style={{
                      width: 56,
                      height: 5,
                      borderRadius: 999,
                      background: 'rgba(148, 163, 184, 0.7)',
                    }}
                  />
                </button>
              ) : null}
              <div ref={pathwayPanelContentRef}>
                <PathwayPanel
                  open={showPathwayPanel}
                  project={project}
                  scenarioName={scenarioName}
                  expanded={pathwayPanelExpanded}
                  onExpandedChange={setPathwayPanelExpanded}
                  onHidePanel={() => {
                    setShowPathwayPanel(false);
                    pathwayPanelHiddenForToolRef.current = true;
                  }}
                />
              </div>
            </animated.div>
          ) : null,
        )}
      </div>

      <div id="cea-project-overlay-right-sidebar">
        {showToolCardSideButtons && <ToolCardSideButtons />}
        {transitionToolsFromRight((styles, item) =>
          item ? (
            <animated.div
              className="cea-overlay-card cea-tool-card-container"
              style={styles}
            >
              <ToolCard onPlotToolSelected={handlePlotToolSelected} />
            </animated.div>
          ) : null,
        )}
      </div>

      <div
        id="cea-project-overlay-bottom-bar"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
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
              onOpenInputEditor={toggleInputEditor}
              onTogglePathwayPanel={togglePathwayPanel}
              pathwayPanelOpen={showPathwayPanel}
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

          <MapLayerCategoriesCard
            mapLayerCategories={mapLayerCategories}
            onCategorySelected={handleCategorySelected}
          />
        </div>
      </div>

      <div id="cea-project-overlay-status">
        <JobInfoList />
      </div>
    </div>
  );
};

export default ProjectOverlay;

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { usePanelVisibility } from 'features/project/hooks/usePanelVisibility';
import { usePathwayPanelResize } from 'features/pathway/hooks/usePathwayPanelResize';

const ProjectOverlay = ({ project, scenarioName }) => {
  const queryClient = useQueryClient();
  const name = useProjectStore((state) => state.name);
  const scenarioList = useProjectStore((state) => state.scenariosList);
  const childScenario = useProjectStore((s) => s.childScenario);
  const clearChildScenario = useProjectStore((s) => s.clearChildScenario);

  const toolType = useToolType();
  const setToolType = useSetToolType();
  const selectPlotTool = useSelectPlotTool();

  const selectedBuildings = useSelected();
  const selectionSource = useSelectionSource();
  const mapLayerCategories = useMapLayerCategories();
  const setActiveMapCategory = useSetActiveMapCategory();
  const setSelectedLayer = useSetSelectedMapLayer();

  const {
    hideAll,
    showInputEditor,
    showPathwayPanel,
    pathwayPanelExpanded,
    setPathwayPanelExpanded,
    pathwayPanelHiddenForTool,
    pathwayPanelHiddenForToolRef,
    showToolBar,
    showToolCardSideButtons,
    showToolCard,
    closeInputEditor,
    toggleInputEditor,
    togglePathwayPanel,
    handleHideAll,
    hidePathwayPanel,
  } = usePanelVisibility({ scenarioName, toolType });

  const {
    pathwayPanelHeight,
    pathwayPanelContentRef,
    handlePathwayResizeStart,
    pathwayPanelTransition,
  } = usePathwayPanelResize({
    open: !hideAll && showPathwayPanel,
    expanded: pathwayPanelExpanded,
  });

  const handlePlotToolSelected = (tool) => {
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
    const firstLayer = category?.layers?.[0];
    if (firstLayer) handleLayerSelected(firstLayer.name);
  };

  const handleLayerSelected = (layer) => {
    const plotScriptName = VIEW_PLOT_RESULTS?.[layer] ?? null;
    useToolCardStore.getState().setSelectedPlotTool(plotScriptName);
    if (plotScriptName) setToolType(toolTypes.MAP_LAYERS);
  };

  const fullscreenPathwayPanelRightInset = showToolCard
    ? 'calc(var(--right-sidebar-width) + 56px)'
    : 12;

  // Watch for building events job completion to close tool card
  const jobs = useJobsStore((state) => state.jobs);
  const buildingEventsHandledRef = useRef(new Set());

  useEffect(() => {
    if (!jobs || !pathwayPanelHiddenForToolRef.current) return;

    const completedJobs = Object.entries(jobs).filter(
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

  // Watch for pathway-simulations job start to close tool card and restore panel
  const pathwaySimHandledRef = useRef(new Set());

  useEffect(() => {
    if (!jobs || !pathwayPanelHiddenForToolRef.current) return;

    const startedJobs = Object.entries(jobs).filter(
      ([id, job]) =>
        job.state >= 1 &&
        job.script === 'pathway-simulations' &&
        !pathwaySimHandledRef.current.has(id),
    );

    if (startedJobs.length > 0) {
      startedJobs.forEach(([id]) => pathwaySimHandledRef.current.add(id));
      setToolType(null);
    }
  }, [jobs, setToolType]);

  // On mount / scenario change: clear any active child-scenario state
  useEffect(() => {
    clearChildScenario();
  }, [scenarioName, clearChildScenario]);

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

  const transitionFromTop = useTransition(showToolBar, {
    from: { transform: 'translateY(-100%)', opacity: 0 }, // Start off-screen (top) and invisible
    enter: { transform: 'translateY(0%)', opacity: 1 }, // Slide in from top and become visible
    leave: { transform: 'translateY(-100%)', opacity: 0 }, // Slide out to top and fade out
    config: { tension, friction }, // Control the speed of the animation
  });

  useEffect(() => {
    // Show building info tool card when buildings are selected on map and input editor is not open
    if (
      selectedBuildings.length > 0 &&
      selectionSource === 'map' &&
      !showInputEditor
    ) {
      // If pathway builder is active with visible pathways, show lifecycle timeline
      if (
        showPathwayPanel &&
        selectedBuildings.length === 1 &&
        useToolCardStore.getState().visiblePathways.length > 0
      ) {
        import('features/pathway/api').then(({ fetchBuildingLifecycle }) => {
          const vp = useToolCardStore.getState().visiblePathways;
          fetchBuildingLifecycle(
            selectedBuildings[0],
            vp.length ? vp : undefined,
          )
            .then((data) => {
              useToolCardStore.getState().setBuildingLifecycleData(data);
              setToolType(toolTypes.BUILDING_INFO);
            })
            .catch(() => {
              setToolType(toolTypes.BUILDING_INFO);
            });
        });
      } else if (!showPathwayPanel) {
        // Clear lifecycle data so building info shows regular mode
        // (skip when pathway panel is open but has no pathways)
        useToolCardStore.getState().clearBuildingLifecycleData();
        setToolType(toolTypes.BUILDING_INFO);
      }
    } else if (
      selectedBuildings.length === 0 &&
      toolType === toolTypes.BUILDING_INFO
    ) {
      setToolType(null);
    }
  }, [
    selectedBuildings,
    selectionSource,
    setToolType,
    showInputEditor,
    showPathwayPanel,
    toolType,
  ]);

  return (
    <div
      id="cea-project-overlay"
      className={showToolCard ? 'show-right-sidebar' : ''}
    >
      {childScenario && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 24,
              border: '3px solid rgba(20, 112, 175, 0.6)',
              boxShadow: 'inset 0 0 200px 60px rgba(20, 112, 175, 0.35)',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
          <button
            type="button"
            onClick={() => {
              clearChildScenario();
              queryClient.invalidateQueries();
            }}
            style={{
              position: 'fixed',
              top: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000,
              pointerEvents: 'auto',
              width: 32,
              height: 32,
              borderRadius: 999,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'rgba(148, 163, 184, 0.85)',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              lineHeight: 1,
            }}
            aria-label="Exit child scenario"
          >
            &times;
          </button>
        </>
      )}
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
                display: pathwayPanelHiddenForTool ? 'none' : 'flex',
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
                  onHidePanel={hidePathwayPanel}
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
              hidePathwayBuilder={!!childScenario?.pathway_name}
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

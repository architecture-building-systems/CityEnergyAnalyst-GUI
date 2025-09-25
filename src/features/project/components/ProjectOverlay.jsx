import { useEffect, useState } from 'react';
import { useTransition, animated } from '@react-spring/web';
import OverviewCard from 'features/project/components/Cards/OverviewCard/OverviewCard';
import Toolbar from 'features/project/components/Cards/Toolbar/Toolbar';
import ToolCard from 'features/project/components/Cards/ToolCard';
import BottomToolButtons from 'features/project/components/Cards/BottomToolBottons/BottomToolButtons';
import MapControls from 'features/map/components/Map/MapControls';
import MapLayerCategoriesCard from 'features/project/components/Cards/MapLayersCard/MapLayersCard';
import MapLayerPropertiesCard from 'features/project/components/Cards/MapLayersCard/MapLayerPropertiesCard';

import UserInfo from 'components/UserInfo';
import ShowHideCardsButton from 'components/ShowHideCardsButton';
import InputTable from './InputTable';
import {
  toolTypes,
  useToolType,
  useSetToolType,
} from 'features/project/stores/tool-card';
import { useProjectStore } from 'features/project/stores/projectStore';
import { VIEW_PLOT_RESULTS } from 'features/plots/constants';
import JobInfoList from 'features/jobs/components/Jobs/JobInfoList';
import { ToolCardSideButtons } from 'features/project/components/Cards/ToolCardSideButtons';
import {
  useSelectedToolStore,
  useSelectedPlotToolStore,
} from 'features/tools/stores/selected-tool';
import {
  useSelected,
  useSelectionSource,
  useResetSelected,
} from 'features/input-editor/stores/inputEditorStore';
import { InputChangesCard } from './Cards/input-changes-card';
import { isElectron } from 'utils/electron';
import {
  useGetMapLayerCategories,
  useMapLayerCategories,
  useSetActiveMapCategory,
} from './Cards/MapLayersCard/store';
import { useSetSelectedMapLayer } from 'features/map/stores/mapStore';

const ProjectOverlay = ({ project, scenarioName }) => {
  const name = useProjectStore((state) => state.name);
  const scenarioList = useProjectStore((state) => state.scenariosList);

  const toolType = useToolType();
  const setToolType = useSetToolType();

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
  const selectedBuildings = useSelected();
  const selectionSource = useSelectionSource();
  const resetSelected = useResetSelected();

  const getMapLayerCategories = useGetMapLayerCategories();
  const mapLayerCategories = useMapLayerCategories();
  const setActiveMapCategory = useSetActiveMapCategory();
  const setSelectedLayer = useSetSelectedMapLayer();

  const handleToolSelected = (tool) => {
    setSelectedTool(tool);
    setToolType(toolTypes.TOOLS);
  };

  const handlePlotToolSelected = (tool) => {
    // Get map layer category from plot script name
    const layer = Object.keys(VIEW_PLOT_RESULTS).find(
      (key) => VIEW_PLOT_RESULTS[key] === tool,
    );
    const category = mapLayerCategories?.categories?.find((cat) =>
      cat.layers.find((l) => l.name === layer),
    );
    if (category) {
      setActiveMapCategory(category?.name);
      setSelectedLayer(layer);
    }

    // Set selected plot tool and switch to map layers tool type
    setSelectedPlotTool(tool);
    setToolType(toolTypes.MAP_LAYERS);
  };

  const handleResetTool = () => {
    if (toolType === toolTypes.TOOLS) {
      setSelectedTool(null);
    } else if (toolType === toolTypes.MAP_LAYERS) {
      setSelectedPlotTool(null);
    }
  };

  const handleCategorySelected = (category) => {
    // Chose the first layer in the category by default
    const firstLayer = category?.layers?.[0];
    if (firstLayer) {
      handleLayerSelected(firstLayer.name);
    }
  };

  const handleLayerSelected = (layer) => {
    const plotScriptName = VIEW_PLOT_RESULTS?.[layer];
    setSelectedPlotTool(plotScriptName);

    if (plotScriptName !== null) setToolType(toolTypes.MAP_LAYERS);
  };

  const [hideAll, setHideAll] = useState(false);
  const [showInputEditor, setInputEditor] = useState(false);

  const showToolBar = scenarioName != null && !hideAll;
  const showToolCardSideButtons = scenarioName != null && !hideAll;
  const showToolCard = scenarioName != null && !hideAll && toolType != null;

  const closeInputEditor = () => {
    setInputEditor(false);
  };

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

  // Fetch map layer categories on mount
  useEffect(() => {
    getMapLayerCategories();
  }, []);

  // Reset state when project or scenario name changes
  useEffect(() => {
    const resetState = () => {
      setToolType(null);
      setSelectedTool(null);

      resetSelected();
      setInputEditor(false);
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
              <Toolbar onToolSelected={handleToolSelected} />
            </animated.div>
          ) : null,
        )}
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
      </div>

      <div id="cea-project-overlay-right-sidebar">
        {showToolCardSideButtons && <ToolCardSideButtons />}
        {transitionToolsFromRight((styles, item) =>
          item ? (
            <animated.div className="cea-overlay-card-full" style={styles}>
              <ToolCard
                selectedTool={selectedTool}
                selectedPlotTool={selectedPlotTool}
                selectedBuildings={selectedBuildings}
                onToolSelected={handleToolSelected}
                onPlotToolSelected={handlePlotToolSelected}
                onResetTool={handleResetTool}
              />
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

import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from 'features/project/stores/projectStore';
import {
  useSetToolType,
  useToolCardStore,
} from 'features/project/stores/tool-card';
import { useResetSelected } from 'features/input-editor/stores/inputEditorStore';
import { useMapStore } from 'features/map/stores/mapStore';

export const usePanelVisibility = ({ scenarioName, toolType }) => {
  const name = useProjectStore((s) => s.name);
  const childScenario = useProjectStore((s) => s.childScenario);
  const setToolType = useSetToolType();
  const resetSelected = useResetSelected();

  const [hideAll, setHideAll] = useState(false);
  const [showInputEditor, setInputEditor] = useState(false);
  const [showPathwayPanel, setShowPathwayPanel] = useState(false);
  const [pathwayPanelExpanded, setPathwayPanelExpanded] = useState(false);
  const [pathwayPanelHiddenForTool, setPathwayPanelHiddenForTool] =
    useState(false);
  const pathwayPanelHiddenForToolRef = useRef(false);

  const showToolBar = scenarioName != null && !hideAll;
  const showToolCardSideButtons = scenarioName != null && !hideAll;
  const showToolCard = scenarioName != null && !hideAll && toolType != null;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!showToolCard && pathwayPanelHiddenForToolRef.current) {
      pathwayPanelHiddenForToolRef.current = false;
      setPathwayPanelHiddenForTool(false);
    }
  }, [showToolCard]);

  useEffect(() => {
    resetSelected();
    setInputEditor(false);
    setShowPathwayPanel(false);
    setPathwayPanelExpanded(false);
  }, [name, scenarioName]);

  useEffect(() => {
    if (childScenario?.pathway_name) {
      setShowPathwayPanel(false);
      setPathwayPanelExpanded(false);
    }
  }, [childScenario?.pathway_name]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const closeInputEditor = () => setInputEditor(false);

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
        setToolType(null);
      } else {
        setPathwayPanelExpanded(false);
        useToolCardStore.getState().clearBuildingLifecycleData();
        useMapStore.getState().setStateZoneOverride(null);
      }
      return next;
    });
  };

  const handleHideAll = () => {
    setHideAll((prev) => {
      const next = !prev;
      if (next) setPathwayPanelExpanded(false);
      return next;
    });
  };

  const hidePathwayPanel = () => {
    setPathwayPanelHiddenForTool(true);
    pathwayPanelHiddenForToolRef.current = true;
  };

  return {
    hideAll,
    showInputEditor,
    showPathwayPanel,
    setShowPathwayPanel,
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
  };
};

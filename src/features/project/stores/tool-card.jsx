import { create } from 'zustand';
import useBuildingSelectionStore from 'stores/buildingSelectionStore';

export const toolTypes = {
  TOOLS: 'tools',
  MAP_LAYERS: 'visualization',
  BUILDING_INFO: 'building-info',
};

export const useToolCardStore = create((set, get) => ({
  toolType: null,
  selectedTool: null,
  selectedPlotTool: null,
  // One-shot form patch applied directly via `form.setFieldsValue` after
  // the plot tool's parameters load, then cleared. Used by the
  // `VIEW_TOOL_RESULTS` "View Results" flow (e.g. pathway-simulations →
  // pathway-emission-timeline) to forward the upstream job's parameters.
  plotToolPrefill: null,
  // Optional seed values for the plot form when opened via
  // `selectPlotTool(tool, { seed })`. Overwritten on each call (a fresh
  // seed, or `null` when the user opens a plot manually from the
  // picker). Not eagerly cleared by PlotTool — that would race with
  // its `setContext` effect and wipe the seed before the form sees it.
  plotToolSeed: null,
  setToolType: (toolType) => {
    // Prevent opening of building info tool if building selection is active
    if (toolType === toolTypes.BUILDING_INFO) {
      const { active } = useBuildingSelectionStore.getState();
      if (active) return;
    }
    set({ toolType });
  },
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  setSelectedPlotTool: (selectedPlotTool) => set({ selectedPlotTool }),
  buildingLifecycleData: null,
  visiblePathways: [],
  setBuildingLifecycleData: (data) => set({ buildingLifecycleData: data }),
  setVisiblePathways: (pathways) => set({ visiblePathways: pathways }),
  clearBuildingLifecycleData: () => set({ buildingLifecycleData: null }),
  closeToolCard: () =>
    set({
      toolType: null,
      buildingLifecycleData: null,
      plotToolPrefill: null,
      plotToolSeed: null,
    }),
  toggleToolType: (type) => {
    const { toolType, setToolType } = get();
    toolType !== type ? setToolType(type) : setToolType(null);
  },
  selectTool: (tool) => {
    set({ selectedTool: tool });
    get().setToolType(toolTypes.TOOLS);
  },
  selectPlotTool: (tool, { prefill = null, seed = null } = {}) => {
    set({
      selectedPlotTool: tool,
      plotToolPrefill: prefill,
      plotToolSeed: seed,
    });
    get().setToolType(toolTypes.MAP_LAYERS);
  },
  clearPlotToolPrefill: () => set({ plotToolPrefill: null }),
}));

export const useToolType = () => useToolCardStore((state) => state.toolType);
export const useSetToolType = () =>
  useToolCardStore((state) => state.setToolType);
export const useSelectedTool = () =>
  useToolCardStore((state) => state.selectedTool);
export const useSelectedPlotTool = () =>
  useToolCardStore((state) => state.selectedPlotTool);
export const useCloseToolCard = () =>
  useToolCardStore((state) => state.closeToolCard);
export const useToggleToolType = () =>
  useToolCardStore((state) => state.toggleToolType);
export const useSelectTool = () =>
  useToolCardStore((state) => state.selectTool);
export const useSelectPlotTool = () =>
  useToolCardStore((state) => state.selectPlotTool);
export const useSelectedPlotToolSeed = () =>
  useToolCardStore((state) => state.plotToolSeed);

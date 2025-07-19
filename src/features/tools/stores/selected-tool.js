import { create } from 'zustand';

export const useSelectedToolStore = create((set) => ({
  selectedTool: null,
  setSelectedTool: (selectedTool) => set({ selectedTool }),
}));

export const useSelectedPlotToolStore = create((set) => ({
  selectedPlotTool: null,
  setSelectedPlotTool: (selectedPlotTool) => set({ selectedPlotTool }),
}));

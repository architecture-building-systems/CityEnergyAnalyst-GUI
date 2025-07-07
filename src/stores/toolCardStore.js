import { create } from 'zustand';

export const useToolCardStore = create((set) => ({
  showTools: false,
  selectedTool: null,
  setVisibility: (selectedTool) => set({ selectedTool }),
  setShowTools: (showTools) => set({ showTools }),
}));

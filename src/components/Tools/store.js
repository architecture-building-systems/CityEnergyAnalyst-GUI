import { create } from 'zustand';

export const useToolStore = create((set) => ({
  showTools: false,
  selectedTool: null,
  setVisibility: (selectedTool) => set({ selectedTool }),
  setShowTools: (showTools) => set({ showTools }),
}));

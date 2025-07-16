import { useCallback } from 'react';
import { create } from 'zustand';

export const toolTypes = {
  TOOLS: 'tools',
  MAP_LAYERS: 'visualization',
  BUILDING_INFO: 'building-info',
};

export const useToolCardStore = create((set) => ({
  toolType: null,
  setToolType: (toolType) => set({ toolType }),
}));

export const useCloseToolCard = () => {
  const setToolType = useToolCardStore((state) => state.setToolType);
  return useCallback(() => setToolType(null), [setToolType]);
};

export const useToolType = () => useToolCardStore((state) => state.toolType);
export const useSetToolType = () =>
  useToolCardStore((state) => state.setToolType);

import { create } from 'zustand';

export const useMapStore = create((set) => ({
  visibility: {},
  mapLabels: true,

  setVisibility: (layer, value) =>
    set((state) => ({ visibility: { ...state.visibility, [layer]: value } })),
  setMapLabels: (value) => set({ mapLabels: value }),
}));

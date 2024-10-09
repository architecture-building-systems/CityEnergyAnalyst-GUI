import { create } from 'zustand';
import { defaultViewState } from '../utils';

export const useMapStore = create((set) => ({
  visibility: {},
  mapLabels: true,
  viewState: defaultViewState,
  extruded: false,
  cameraOptions: defaultViewState,
  selectedMapCategory: {},
  mapLayerParameters: null,

  setVisibility: (layer, value) =>
    set((state) => ({ visibility: { ...state.visibility, [layer]: value } })),
  setMapLabels: (value) => set({ mapLabels: value }),
  setViewState: (value) =>
    set((state) => {
      if (typeof value === 'function') {
        const nextState = value(state.viewState);
        return { viewState: nextState };
      } else {
        return { viewState: value };
      }
    }),
  setExtruded: (value) => set({ extruded: value }),
  setCameraOptions: (value) => set({ cameraOptions: value }),
  resetCameraOptions: () => set({ cameraOptions: defaultViewState }),
  setSelectedMapCategory: (value) => set({ selectedMapCategory: value }),
  setMapLayerParameters: (value) => set({ mapLayerParameters: value }),
}));

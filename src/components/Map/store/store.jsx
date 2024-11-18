import { create } from 'zustand';
import { defaultViewState } from '../utils';

export const useMapStore = create((set) => ({
  visibility: {},
  mapLabels: true,
  viewState: defaultViewState,
  extruded: false,
  cameraOptions: defaultViewState,
  selectedMapCategory: null,
  mapLayerParameters: null,
  mapLayerLegends: null,
  mapLayers: null,
  filter: [0, 1000],
  range: [0, 1000],

  setVisibility: (layer, value) =>
    set((state) => ({ visibility: { ...state.visibility, [layer]: value } })),
  setMapLabels: (value) => set({ mapLabels: value }),
  setViewState: (value) =>
    set((state) => ({
      viewState: typeof value === 'function' ? value(state.viewState) : value,
    })),
  setExtruded: (value) => set({ extruded: value }),
  setCameraOptions: (value) => set({ cameraOptions: value }),
  resetCameraOptions: () => set({ cameraOptions: defaultViewState }),
  setSelectedMapCategory: (value) => set({ selectedMapCategory: value }),
  setMapLayerParameters: (value) =>
    set((state) => ({
      mapLayerParameters:
        typeof value === 'function' ? value(state.mapLayerParameters) : value,
    })),
  setMapLayerLegends: (value) => set({ mapLayerLegends: value }),
  removeMapLayerLegend: (value) =>
    set((state) => {
      const mapLayerLegends = { ...state.mapLayerLegends };
      delete mapLayerLegends[value];
      return { mapLayerLegends };
    }),
  setMapLayers: (value) => set({ mapLayers: value }),
  setFilter: (value) => set({ filter: value }),
  setRange: (value) => set({ range: value }),
}));

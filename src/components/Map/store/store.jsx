import { create } from 'zustand';
import { defaultViewState } from '../utils';

export const useMapStore = create((set) => ({
  visibility: {},
  mapLabels: true,
  viewState: defaultViewState,
  extruded: false,
  cameraOptions: null,
  selectedMapCategory: null,
  mapLayerParameters: null,
  mapLayerLegends: null,
  mapLayers: null,
  filters: {},
  range: [0, 0],

  setVisibility: (layer, value) =>
    set((state) => ({ visibility: { ...state.visibility, [layer]: value } })),
  setMapLabels: (value) => set({ mapLabels: value }),
  setViewState: (value) =>
    set((state) => ({
      viewState: typeof value === 'function' ? value(state.viewState) : value,
    })),
  setExtruded: (value) => set({ extruded: value }),
  setCameraOptions: (value) => set({ cameraOptions: value }),
  resetCameraOptions: () => set({ cameraOptions: null }),
  setSelectedMapCategory: (value) => set({ selectedMapCategory: value }),
  setMapLayerParameters: (value) =>
    set((state) => ({
      mapLayerParameters:
        typeof value === 'function' ? value(state.mapLayerParameters) : value,
    })),
  removeMapLayerParameter: (key) =>
    set((state) => {
      const mapLayerParameters = { ...state.mapLayerParameters };
      delete mapLayerParameters[key];
      return { mapLayerParameters };
    }),
  setMapLayerLegends: (value) => set({ mapLayerLegends: value }),
  removeMapLayerLegend: (value) =>
    set((state) => {
      const mapLayerLegends = { ...state.mapLayerLegends };
      delete mapLayerLegends[value];
      return { mapLayerLegends };
    }),
  setMapLayers: (value) => set({ mapLayers: value }),
  setFilters: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: typeof value === 'function' ? value(state.filters[key]) : value,
      },
    })),
  setRange: (value) => set({ range: value }),
}));

export const useCameraOptionsCalulated = () =>
  useMapStore((state) => state.cameraOptions !== null);

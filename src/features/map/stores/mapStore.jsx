import { create } from 'zustand';
import { defaultViewState } from 'features/map/utils';

// Color modes for building visualization
export const COLOR_MODES = {
  DEFAULT: 'default',
  CONSTRUCTION_STANDARD: 'construction-standard',
  USE_TYPE: 'use-type',
};

export const useMapStore = create((set) => ({
  visibility: {},
  mapLabels: true,
  viewState: defaultViewState,
  extruded: false,
  cameraOptions: null,
  selectedMapLayer: null,
  mapLayerParameters: null,
  mapLayerLegends: null,
  mapLayers: null,
  filters: {},
  range: [0, 0],

  // Revision counter bumped when external events (e.g. a successful
  // network-layout job) should force map-layer choice dropdowns to refetch
  // their options, even if their `dependsOn` values haven't changed.
  choicesRevision: 0,

  // Construction standard / use type coloring state
  colorMode: COLOR_MODES.DEFAULT,
  constructionColorMap: {},
  useTypeColorMap: {},

  setVisibility: (layer, value) =>
    set((state) => ({ visibility: { ...state.visibility, [layer]: value } })),
  setMapLabels: (value) => set({ mapLabels: value }),
  setViewState: (value) =>
    set((state) => ({
      viewState: typeof value === 'function' ? value(state.viewState) : value,
    })),
  updateViewState: (value) =>
    set((state) => ({ viewState: { ...state.viewState, ...value } })),
  setExtruded: (value) => set({ extruded: value }),
  setCameraOptions: (value) => set({ cameraOptions: value }),
  resetCameraOptions: () => set({ cameraOptions: null }),
  setSelectedMapLayer: (value) => set({ selectedMapLayer: value }),
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
  bumpChoicesRevision: () =>
    set((state) => ({ choicesRevision: state.choicesRevision + 1 })),

  // Construction standard coloring setters
  setColorMode: (value) => set({ colorMode: value }),
  setConstructionColorMap: (value) => set({ constructionColorMap: value }),
  setUseTypeColorMap: (value) => set({ useTypeColorMap: value }),
}));

export const useCameraOptionsCalculated = () =>
  useMapStore((state) => state.cameraOptions !== null);

export const useSelectedMapLayer = () =>
  useMapStore((state) => state.selectedMapLayer);

export const useSetSelectedMapLayer = () =>
  useMapStore((state) => state.setSelectedMapLayer);

import { apiClient } from 'lib/api/axios';
import { create } from 'zustand';

export const useMapLayersStore = create((set) => ({
  data: null,
  active: null,

  getLayerCategories: async () => {
    try {
      const resp = await apiClient.get(`/api/map_layers/`);
      set({ data: resp.data });
    } catch (err) {
      console.error(err);
      if (err?.response.status !== 200) {
        throw new Error(
          `Error fetching map layers: ${err?.response.statusText}`,
        );
      }
    }
  },
  setLayers: (data) => set({ data }),
  setActive: (active) => set({ active }),
}));

export const useGetMapLayerCategories = () =>
  useMapLayersStore((state) => state.getLayerCategories);

export const useMapLayerCategories = () =>
  useMapLayersStore((state) => state.data);

export const useSetMapLayers = () =>
  useMapLayersStore((state) => state.setLayers);

export const useActiveMapLayer = () =>
  useMapLayersStore((state) => state.active);

export const useSetActiveMapLayer = () =>
  useMapLayersStore((state) => state.setActive);

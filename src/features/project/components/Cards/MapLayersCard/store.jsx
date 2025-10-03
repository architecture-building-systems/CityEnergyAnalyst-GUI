import { apiClient } from 'lib/api/axios';
import { create } from 'zustand';

export const useMapCategoryStore = create((set) => ({
  data: null,
  active: null,

  getCategories: async () => {
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
  setCategories: (data) => set({ data }),
  setActive: (active) => set({ active }),
}));

export const useGetMapLayerCategories = () =>
  useMapCategoryStore((state) => state.getCategories);

export const useMapLayerCategories = () =>
  useMapCategoryStore((state) => state.data);

export const useSetMapCategories = () =>
  useMapCategoryStore((state) => state.setCategories);

export const useActiveMapCategory = () =>
  useMapCategoryStore((state) => state.active);

export const useSetActiveMapCategory = () =>
  useMapCategoryStore((state) => state.setActive);

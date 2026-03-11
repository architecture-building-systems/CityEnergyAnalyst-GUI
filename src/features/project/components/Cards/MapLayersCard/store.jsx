import { apiClient } from 'lib/api/axios';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

export const useMapCategoryStore = create((set) => ({
  active: null,
  setActive: (active) => set({ active }),
}));

export const MAP_LAYER_CATEGORIES_QUERY_KEY = ['map-layer-categories'];

export const fetchMapLayerCategories = async () => {
  try {
    const { data } = await apiClient.get('/api/map_layers/');
    return data;
  } catch (err) {
    console.error(err);
    throw new Error(
      `Error fetching map layers: ${err?.response?.statusText || err.message}`,
    );
  }
};

export const useMapLayerCategoriesQuery = () => {
  return useQuery({
    queryKey: MAP_LAYER_CATEGORIES_QUERY_KEY,
    queryFn: fetchMapLayerCategories,
    staleTime: Infinity,
  });
};

export const useMapLayerCategories = () => {
  const { data } = useMapLayerCategoriesQuery();
  return data;
};

export const useGetMapLayerCategories = () => {
  const { refetch } = useMapLayerCategoriesQuery();
  return refetch;
};

export const useActiveMapCategory = () =>
  useMapCategoryStore((state) => state.active);

export const useSetActiveMapCategory = () =>
  useMapCategoryStore((state) => state.setActive);

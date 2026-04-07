import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';

const fetchTooltips = async () => {
  const { data } = await apiClient.get('/api/tooltips/');
  return data;
};

export const useTooltips = () => {
  return useQuery({
    queryKey: ['tooltips'],
    queryFn: fetchTooltips,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

/**
 * Get a tooltip entry by key.
 * Returns { title, body } or { body } for simple tooltips.
 * Returns null if not found or not loaded.
 */
export const useTooltip = (key) => {
  const { data } = useTooltips();
  return data?.[key] ?? null;
};

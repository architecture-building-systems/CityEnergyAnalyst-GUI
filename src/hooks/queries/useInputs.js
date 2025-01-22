import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/axios';
import { API_ENDPOINTS } from '../../api/endpoints';
import { useProjectStore } from '../../components/Project/store';

export function useInputs() {
  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  return useQuery({
    queryKey: ['inputs', projectName, scenarioName],
    queryFn: async () => {
      // Return empty object if projectName or scenarioName is not defined
      if (!projectName || !scenarioName) return {};

      try {
        const { data } = await apiClient.get(
          `${API_ENDPOINTS.INPUTS}/all-inputs`,
        );
        return data;
      } catch (error) {
        throw new Error(
          error?.response?.data?.detail ??
            'Unknown error: Unable to fetch inputs.',
        );
      }
    },
    initialData: {},
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

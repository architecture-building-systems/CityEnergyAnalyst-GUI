import { useQueries } from '@tanstack/react-query';
import { apiClient } from '../../api/axios';
import { API_ENDPOINTS } from '../../api/endpoints';
import { useProjectStore } from '../../components/Project/store';

export function useSchedules(buildings) {
  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  const results = useQueries({
    queries: buildings.map((building) => {
      const queryKey = [
        'inputs',
        'building-schedule',
        building,
        projectName,
        scenarioName,
      ];

      return {
        queryKey,
        queryFn: async () => {
          // Return empty object if projectName or scenarioName is not defined
          if (!projectName || !scenarioName) return {};

          const { data } = await apiClient.get(
            `${API_ENDPOINTS.INPUTS}/building-schedule/${building}`,
          );
          return data;
        },
        refetchOnMount: false,
      };
    }),
  });

  const isLoading = results.some((result) => result.isFetching);
  const schedules = buildings.reduce((obj, key, index) => {
    obj[key] = results?.[index]?.data ?? {};
    return obj;
  }, {});

  return { isLoading, schedules };
}

import { useQueries } from '@tanstack/react-query';
import { apiClient } from '../../api/axios';
import { API_ENDPOINTS } from '../../api/endpoints';
import { useProjectStore } from '../../components/Project/store';
import { useFetchedSchedules } from '../../components/InputEditor/store';

export function useSchedules() {
  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  const buildings = Array.from(useFetchedSchedules());

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
        refetchOnWindowFocus: false,
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

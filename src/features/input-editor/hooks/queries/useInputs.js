import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';

export function useInputs() {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);

  const scenarioPath = childScenario?.scenario_path ?? null;

  return useQuery({
    queryKey: ['inputs', project, scenarioName, scenarioPath],
    queryFn: async () => {
      // Return empty object if project or scenarioName is not defined
      if (!project || !scenarioName) return {};

      const params = scenarioPath
        ? { scenario_path: scenarioPath }
        : { project, scenario_name: scenarioName };

      try {
        const { data } = await apiClient.get(
          `${API_ENDPOINTS.INPUTS}/all-inputs`,
          { params },
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

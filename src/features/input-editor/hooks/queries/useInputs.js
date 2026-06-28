import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';
import {
  activeScenarioHeaders,
  childScenarioToken,
} from 'lib/api/scenarioContext';

export function useInputs() {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);
  const childToken = childScenarioToken(childScenario);

  return useQuery({
    queryKey: ['inputs', project, scenarioName, childToken],
    queryFn: async () => {
      if (!project || !scenarioName) return {};
      const { data } = await apiClient.get(
        `${API_ENDPOINTS.INPUTS}/all-inputs`,
        { headers: activeScenarioHeaders() },
      );
      return data;
    },
    initialData: {},
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

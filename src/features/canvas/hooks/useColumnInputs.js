import { useQuery } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';
import { childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';

import { useScenarioRequestContext } from './useScenarioRequestContext';

/**
 * Fetch inputs for a specific canvas column scenario.
 * Unlike `useInputs`, this targets an explicit scenario rather than
 * the active project scenario, so each comparison column can load
 * its own data independently.
 */
export function useColumnInputs(columnScenario, project) {
  const activeProject = useProjectStore((state) => state.project);
  const effectiveProject = project ?? activeProject;
  const { scenario, childScenario } = useScenarioRequestContext(columnScenario);

  return useQuery({
    queryKey: [
      'inputs',
      effectiveProject,
      scenario,
      childScenarioToken(childScenario),
    ],
    queryFn: async () => {
      if (!effectiveProject || !scenario) return {};
      const { data } = await getScenarioClient().get(
        `${API_ENDPOINTS.INPUTS}/all-inputs`,
        {
          headers: scenarioHeaders({
            project: effectiveProject,
            scenarioName: scenario,
            childScenario,
          }),
        },
      );
      return data;
    },
    initialData: {},
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

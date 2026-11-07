import { useQuery } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';

import { useColumnRequest } from './useScenarioRequestContext';

/**
 * Fetch inputs for a specific canvas column scenario.
 * Unlike `useInputs`, this targets an explicit scenario rather than
 * the active project scenario, so each comparison column can load
 * its own data independently.
 * Arguments as `useColumnRequest`.
 */
export function useColumnInputs(columnScenario, project, childScenario = null) {
  const {
    project: effectiveProject,
    scenario,
    childScenario: stateScenario,
  } = useColumnRequest(columnScenario, project, childScenario);

  return useQuery({
    queryKey: [
      'inputs',
      effectiveProject,
      scenario,
      childScenarioToken(stateScenario),
    ],
    queryFn: async () => {
      if (!effectiveProject || !scenario) return {};
      const { data } = await getScenarioClient().get(
        `${API_ENDPOINTS.INPUTS}/all-inputs`,
        {
          headers: scenarioHeaders({
            project: effectiveProject,
            scenarioName: scenario,
            childScenario: stateScenario,
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

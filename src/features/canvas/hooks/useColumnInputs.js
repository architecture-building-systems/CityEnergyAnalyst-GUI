import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';
import { scenarioHeaders } from 'lib/api/scenarioContext';

/**
 * Fetch inputs for a specific canvas column scenario.
 * Unlike `useInputs`, this targets an explicit scenario rather than
 * the active project scenario, so each comparison column can load
 * its own data independently.
 */
export function useColumnInputs(scenario, project) {
  const activeProject = useProjectStore((state) => state.project);
  const effectiveProject = project ?? activeProject;

  return useQuery({
    queryKey: ['inputs', effectiveProject, scenario, null],
    queryFn: async () => {
      if (!effectiveProject || !scenario) return {};
      const { data } = await apiClient.get(
        `${API_ENDPOINTS.INPUTS}/all-inputs`,
        {
          headers: scenarioHeaders({
            project: effectiveProject,
            scenarioName: scenario,
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

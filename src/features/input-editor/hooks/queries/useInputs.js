import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';

/**
 * Fetch the map + input-editor data bundle.
 *
 * Default: reads the currently active project+scenario from
 * `useProjectStore`. Pass `{ scenario, project }` to fetch a
 * non-active scenario WITHOUT switching the dashboard's active
 * config — used by the canvas to render per-column maps.
 *
 * Each distinct (project, scenario, childScenario) tuple caches
 * separately so sibling Canvas Builder columns don't thrash each
 * other's data, and the pathway viewer shows state-folder inputs.
 */
export function useInputs(options) {
  const activeProject = useProjectStore((state) => state.project);
  const activeScenario = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);

  const scenarioOverride = options?.scenario ?? null;
  const projectOverride = options?.project ?? null;

  const projectName = scenarioOverride
    ? projectOverride || activeProject
    : activeProject;
  const scenarioName = scenarioOverride ?? activeScenario;
  // childScenario only applies when no explicit caller override is given
  const scenarioPath = scenarioOverride
    ? null
    : (childScenario?.scenario_path ?? null);

  return useQuery({
    queryKey: ['inputs', projectName, scenarioName, scenarioPath],
    queryFn: async () => {
      if (!projectName || !scenarioName) return {};

      try {
        const params = scenarioOverride
          ? { scenario: scenarioOverride, project: projectOverride || undefined }
          : scenarioPath
          ? { scenario_path: scenarioPath }
          : { project: projectName, scenario_name: scenarioName };
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

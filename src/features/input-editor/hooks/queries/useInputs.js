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
 * config — used by Reports to render per-column maps.
 *
 * Each distinct (project, scenario) pair caches separately so
 * sibling Reports columns don't thrash each other's data.
 */
export function useInputs(options) {
  const activeProject = useProjectStore((state) => state.name);
  const activeScenario = useProjectStore((state) => state.scenario);

  const scenarioOverride = options?.scenario ?? null;
  const projectOverride = options?.project ?? null;

  // When the caller hands in a scenario override, gate the query on
  // that (not on the active scenario). The active project name is
  // still used as the fallback project so callers usually only need
  // to pass `scenario`.
  const projectName = scenarioOverride
    ? projectOverride || activeProject
    : activeProject;
  const scenarioName = scenarioOverride ?? activeScenario;

  return useQuery({
    queryKey: ['inputs', projectName, scenarioName],
    queryFn: async () => {
      // Return empty object if projectName or scenarioName is not defined
      if (!projectName || !scenarioName) return {};

      try {
        const params = scenarioOverride
          ? { scenario: scenarioOverride, project: projectOverride || undefined }
          : undefined;
        const { data } = await apiClient.get(
          `${API_ENDPOINTS.INPUTS}/all-inputs`,
          params ? { params } : undefined,
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

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
 * Each distinct (project, scenario) pair caches separately so
 * sibling Canvas Builder columns don't thrash each other's data.
 *
 * When no override is given, `childScenario.scenario_path` (set by
 * the pathway viewer) takes effect so the input editor and map reflect
 * the selected pathway state.
 */
export function useInputs(options) {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);

  const scenarioOverride = options?.scenario ?? null;
  const projectOverride = options?.project ?? null;

  // Canvas per-column override wins; fetch a named scenario without
  // touching the active config or the pathway child-scenario.
  const effectiveProject = scenarioOverride
    ? projectOverride || project
    : project;
  const effectiveScenario = scenarioOverride ?? scenarioName;
  // child-scenario path only applies to the active (non-override) fetch
  const scenarioPath = scenarioOverride
    ? null
    : (childScenario?.scenario_path ?? null);

  return useQuery({
    queryKey: ['inputs', effectiveProject, effectiveScenario, scenarioPath],
    queryFn: async () => {
      if (scenarioPath == null && (!effectiveProject || !effectiveScenario))
        return {};

      const params = scenarioPath
        ? { scenario_path: scenarioPath }
        : { project: effectiveProject, scenario_name: effectiveScenario };

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

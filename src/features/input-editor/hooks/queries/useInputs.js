import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';
import { activeScenarioHeaders, childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';

/**
 * Fetch the map + input-editor data bundle.
 *
 * Default: reads the currently active project+scenario from
 * `useProjectStore`. The global axios interceptor injects
 * `X-CEA-Project` / `X-CEA-Scenario-Name` / `X-CEA-Child-Scenario`
 * headers automatically for active-scenario requests.
 *
 * Pass `{ scenario, project }` to fetch a non-active scenario WITHOUT
 * switching the dashboard's active config — used by the canvas to
 * render per-column maps. These calls use explicit header overrides so
 * the interceptor's active-scenario headers are suppressed.
 *
 * Each distinct (project, scenario) pair caches separately so
 * sibling Canvas Builder columns don't thrash each other's data.
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
  // Child-scenario token only applies to the active (non-override) fetch.
  const childToken =
    scenarioOverride == null ? childScenarioToken(childScenario) : null;

  return useQuery({
    queryKey: ['inputs', effectiveProject, effectiveScenario, childToken],
    queryFn: async () => {
      if (!effectiveProject || !effectiveScenario) return {};

      // For the canvas per-column override path, pass explicit headers so the
      // global interceptor's active-scenario context is suppressed. The active
      // path relies on the interceptor and sends no per-request headers.
      const requestConfig = scenarioOverride
        ? {
            headers: scenarioHeaders({
              project: effectiveProject,
              scenarioName: effectiveScenario,
            }),
          }
        : { headers: activeScenarioHeaders() };

      try {
        const { data } = await apiClient.get(
          `${API_ENDPOINTS.INPUTS}/all-inputs`,
          requestConfig,
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

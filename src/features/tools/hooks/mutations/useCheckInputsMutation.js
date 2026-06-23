import { useContext } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { TOOLS_MUTATION_KEYS } from '../../constants/queryKeys';
import { ToolScenarioOverrideContext } from '../useToolParams';
import { useProjectStore } from 'features/project/stores/projectStore';

export function useCheckInputsMutation() {
  // Same override the schema fetcher uses — when a tool form is
  // mounted under a `ToolScenarioOverrideContext.Provider` (e.g.
  // Canvas Builder's compare-mode per-column edit), forward the
  // override as `?project=&scenario_name=` query params so
  // `/check` validates against the same scenario the form is
  // displaying choices from. Without this the validation would
  // silently use the project store's active scenario, surfacing
  // "Invalid value" errors with the wrong "Available: …" list.
  const override = useContext(ToolScenarioOverrideContext);
  const project = useProjectStore((s) => s.project);
  const scenarioName = useProjectStore((s) => s.scenario);
  const childScenario = useProjectStore((s) => s.childScenario);
  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.CHECK_INPUTS],
    mutationFn: async ({ tool, parameters }) => {
      if (!tool) {
        throw new Error('Tool not specified for checking missing inputs.');
      }
      if (parameters == null) {
        throw new Error('Parameters not provided for checking missing inputs.');
      }

      let params;
      if (override) {
        params = {
          project: override.project,
          scenario_name: override.scenarioName,
        };
      } else if (childScenario?.scenario_path) {
        params = { scenario_path: childScenario.scenario_path };
      } else if (project && scenarioName) {
        params = { project, scenario_name: scenarioName };
      }

      try {
        const response = await apiClient.post(
          `/api/tools/${tool}/check`,
          parameters,
          { params },
        );
        return response.data;
      } catch (err) {
        const error = new Error(err.message);
        error.response = {
          status: err.response?.status,
          data: err.response?.data,
          statusText: err.response?.statusText,
        };
        throw error;
      }
    },
  });
}

import { useMutation } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import {
  activeScenarioHeaders,
  scenarioHeaders,
} from 'lib/api/scenarioContext';
import { TOOLS_MUTATION_KEYS } from '../../constants/queryKeys';

export function useCheckInputsMutation(scenarioOverride = null) {
  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.CHECK_INPUTS],
    mutationFn: async ({ tool, parameters }) => {
      if (!tool) {
        throw new Error('Tool not specified for checking missing inputs.');
      }
      if (parameters == null) {
        throw new Error('Parameters not provided for checking missing inputs.');
      }

      const requestConfig = scenarioOverride
        ? {
            headers: scenarioHeaders({
              project: scenarioOverride.project,
              scenarioName: scenarioOverride.scenarioName,
            }),
          }
        : { headers: activeScenarioHeaders() };

      try {
        const response = await apiClient.post(
          `/api/tools/${tool}/check`,
          parameters,
          requestConfig,
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

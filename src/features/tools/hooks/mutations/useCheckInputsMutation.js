import { useMutation } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';
import { TOOLS_MUTATION_KEYS } from '../../constants/queryKeys';

export function useCheckInputsMutation(scenarioContext) {
  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.CHECK_INPUTS],
    mutationFn: async ({ tool, parameters }) => {
      if (!tool) {
        throw new Error('Tool not specified for checking missing inputs.');
      }
      if (parameters == null) {
        throw new Error('Parameters not provided for checking missing inputs.');
      }

      try {
        const response = await getScenarioClient().post(
          `/api/tools/${tool}/check`,
          parameters,
          { headers: scenarioHeaders(scenarioContext) },
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

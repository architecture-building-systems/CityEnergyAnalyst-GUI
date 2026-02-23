import { useMutation } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { TOOLS_MUTATION_KEYS } from '../../constants/queryKeys';

export function useCheckInputsMutation() {
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
        const response = await apiClient.post(
          `/api/tools/${tool}/check`,
          parameters,
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

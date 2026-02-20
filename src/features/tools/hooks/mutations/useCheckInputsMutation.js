import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { TOOLS_QUERY_KEYS } from '../../constants/queryKeys';

export function useCheckInputsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['checkInputs'],
    mutationFn: async ({ tool, parameters }) => {
      if (!tool) {
        throw new Error('Tool not specified for checking missing inputs.');
      }
      if (parameters == null) {
        throw new Error('Parameters not provided for checking missing inputs.');
      }
      const response = await apiClient.post(
        `/api/tools/${tool}/check`,
        parameters,
      );
      return response.data;
    },
    onSuccess: (_, { tool }) => {
      queryClient.setQueryData([TOOLS_QUERY_KEYS.TOOL_PARAMS, tool], (old) =>
        old ? { ...old, inputError: null } : old,
      );
    },
    onError: (err, { tool }) => {
      const message =
        err.response?.data?.detail ||
        err.response?.statusText ||
        err.message ||
        'Unexpected error';
      queryClient.setQueryData([TOOLS_QUERY_KEYS.TOOL_PARAMS, tool], (old) =>
        old ? { ...old, inputError: message } : old,
      );
    },
  });
}

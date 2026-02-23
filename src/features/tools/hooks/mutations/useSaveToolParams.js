import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import {
  TOOLS_MUTATION_KEYS,
  TOOLS_QUERY_KEYS,
} from '../../constants/queryKeys';

export function useSaveToolParamsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.SAVE_TOOL_PARAMS],
    mutationFn: async ({ tool, params }) => {
      try {
        const response = await apiClient.post(
          `/api/tools/${tool}/save-config`,
          params,
        );
        await queryClient.refetchQueries({
          queryKey: [TOOLS_QUERY_KEYS.TOOL_PARAMS, tool],
        });
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

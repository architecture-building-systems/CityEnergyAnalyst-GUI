import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import {
  TOOLS_MUTATION_KEYS,
  TOOLS_QUERY_KEYS,
} from '../../constants/queryKeys';

/**
 * Hook to reset tool parameters to default
 * @returns {Object} Mutation object with mutate, mutateAsync, isPending, error, etc.
 */
export function useSetDefaultToolParamsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.SET_DEFAULT_TOOL_PARAMS],
    mutationFn: async (tool) => {
      const response = await apiClient.post(`/api/tools/${tool}/default`);
      return response.data;
    },
    onSuccess: (_, tool) => {
      // Invalidate tool params query to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: [TOOLS_QUERY_KEYS.TOOL_PARAMS, tool],
      });
    },
  });
}

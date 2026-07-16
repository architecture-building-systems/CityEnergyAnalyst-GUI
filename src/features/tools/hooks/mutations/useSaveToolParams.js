import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { activeScenarioHeaders } from 'lib/api/scenarioContext';
import {
  TOOLS_MUTATION_KEYS,
  TOOLS_QUERY_KEYS,
} from '../../constants/queryKeys';
import { useIsNonLocalMode, useUserInfo } from 'stores/useUserQuery';
import { mergeStoredToolConfig } from '../../toolConfigStorage';

export function useSaveToolParamsMutation() {
  const queryClient = useQueryClient();
  const isNonLocal = useIsNonLocalMode();
  const userId = useUserInfo()?.id;

  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.SAVE_TOOL_PARAMS],
    mutationFn: async ({ tool, params }) => {
      try {
        const response = await apiClient.post(
          `/api/tools/${tool}/save-config`,
          params,
          { headers: activeScenarioHeaders() },
        );

        // Non-local backend save-config is a no-op (stateless config) -
        // persist the saved values client-side so the refetch below (which
        // will return backend defaults) gets overlaid with them instead of
        // wiping the form. See toolConfigStorage.js / useToolParams.js.
        if (isNonLocal) {
          mergeStoredToolConfig(userId, params);
        }

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

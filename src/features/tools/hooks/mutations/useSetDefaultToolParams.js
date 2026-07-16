import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { activeScenarioHeaders } from 'lib/api/scenarioContext';
import {
  TOOLS_MUTATION_KEYS,
  TOOLS_QUERY_KEYS,
} from '../../constants/queryKeys';
import { useIsNonLocalMode, useUserInfo } from 'stores/useUserQuery';
import {
  clearStoredToolConfig,
  getToolParamNames,
} from '../../toolConfigStorage';

export function useSetDefaultToolParamsMutation() {
  const queryClient = useQueryClient();
  const isNonLocal = useIsNonLocalMode();
  const userId = useUserInfo()?.id;

  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.SET_DEFAULT_TOOL_PARAMS],
    mutationFn: async (tool) => {
      try {
        const response = await apiClient.post(
          `/api/tools/${tool}/default`,
          undefined,
          { headers: activeScenarioHeaders() },
        );

        // Non-local backend has nothing to reset server-side (stateless
        // config) - drop this tool's client-persisted overrides so the
        // refetch below shows the backend's actual defaults instead of the
        // stored values being overlaid straight back on top of them.
        if (isNonLocal) {
          const cachedEntries = queryClient.getQueriesData({
            queryKey: [TOOLS_QUERY_KEYS.TOOL_PARAMS, tool],
          });
          const paramNames = new Set();
          for (const [, data] of cachedEntries) {
            getToolParamNames(data).forEach((name) => paramNames.add(name));
          }
          clearStoredToolConfig(userId, [...paramNames]);
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

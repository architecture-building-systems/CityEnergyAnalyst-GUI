import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';
import {
  TOOLS_MUTATION_KEYS,
  TOOLS_QUERY_KEYS,
} from '../../constants/queryKeys';
import { useIsNonLocalMode, useUserInfo } from 'stores/useUserQuery';
import {
  clearStoredToolConfig,
  getToolParamNames,
} from '../../toolConfigStorage';

// See useSaveToolParams.js for why scenarioContext must be threaded through
// rather than read from the active-scenario store.
export function useSetDefaultToolParamsMutation(scenarioContext) {
  const queryClient = useQueryClient();
  const isNonLocal = useIsNonLocalMode();
  const userId = useUserInfo()?.id;
  const { project, scenarioName, childScenario } = scenarioContext;

  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.SET_DEFAULT_TOOL_PARAMS],
    mutationFn: async (tool) => {
      try {
        const response = await apiClient.post(
          `/tools/${tool}/default`,
          undefined,
          {
            headers: scenarioHeaders({ project, scenarioName, childScenario }),
          },
        );

        const scopedKey = [
          TOOLS_QUERY_KEYS.TOOL_PARAMS,
          tool,
          project,
          scenarioName,
          childScenarioToken(childScenario),
        ];

        // Non-local backend has nothing to reset server-side (stateless
        // config) - drop this tool's client-persisted overrides so the
        // refetch below shows the backend's actual defaults instead of the
        // stored values being overlaid straight back on top of them.
        if (isNonLocal) {
          const cachedEntries = queryClient.getQueriesData({
            queryKey: scopedKey,
          });
          const paramNames = new Set();
          for (const [, data] of cachedEntries) {
            getToolParamNames(data).forEach((name) => paramNames.add(name));
          }
          clearStoredToolConfig(userId, [...paramNames]);
        }

        await queryClient.refetchQueries({
          queryKey: scopedKey,
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

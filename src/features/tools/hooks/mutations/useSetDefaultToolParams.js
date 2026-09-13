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
import { isToolProperties } from '../../utils';

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

        const hasFreshState = isToolProperties(response.data);

        // Non-local backend has nothing to reset server-side (stateless
        // config) - drop this tool's client-persisted overrides so the
        // cache write below shows the backend's actual defaults instead of the
        // stored values being overlaid straight back on top of them. Must run
        // before the cache write, for the same overlay-ordering reason as
        // useSaveToolParams.js.
        if (isNonLocal) {
          const state = hasFreshState
            ? response.data
            : queryClient.getQueryData(scopedKey);
          clearStoredToolConfig(userId, getToolParamNames(state));
        }

        // See useSaveToolParams.js: adopt the backend's returned state directly
        // instead of a separate refetch, falling back to a refetch against an
        // older backend that doesn't return it yet.
        if (hasFreshState) {
          queryClient.setQueryData(scopedKey, response.data);
        } else {
          await queryClient.refetchQueries({ queryKey: scopedKey });
        }

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

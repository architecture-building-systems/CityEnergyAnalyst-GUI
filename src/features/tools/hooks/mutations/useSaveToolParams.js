import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';
import {
  TOOLS_MUTATION_KEYS,
  TOOLS_QUERY_KEYS,
} from '../../constants/queryKeys';
import { useIsNonLocalMode, useUserInfo } from 'stores/useUserQuery';
import { mergeStoredToolConfig } from '../../toolConfigStorage';
import { isToolProperties } from '../../utils';

// `scenarioContext` must be the same `{ project, scenarioName, childScenario }` the
// caller's useToolParams was fetched with -- it picks both the request headers AND the
// cache entry that gets updated. Reading the active scenario from the store here
// instead would send the wrong headers and update every scenario's cache entry (via a
// bare [TOOL_PARAMS, tool] prefix) whenever the caller is a scenarioOverride column,
// which does not track the active scenario. See useParameterMetadataRefetch.js.
export function useSaveToolParamsMutation(scenarioContext) {
  const queryClient = useQueryClient();
  const isNonLocal = useIsNonLocalMode();
  const userId = useUserInfo()?.id;
  const { project, scenarioName, childScenario } = scenarioContext;

  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.SAVE_TOOL_PARAMS],
    mutationFn: async ({ tool, params }) => {
      try {
        const response = await apiClient.post(
          `/tools/${tool}/save-config`,
          params,
          {
            headers: scenarioHeaders({ project, scenarioName, childScenario }),
          },
        );

        // Non-local backend save-config is a no-op (stateless config) -
        // persist the saved values client-side so the cache write below (which
        // will carry backend defaults) gets overlaid with them instead of
        // wiping the form. Must run before the setQueryData below: useToolParams'
        // `select` overlays this stored config on every read, so writing the
        // cache first would let that read see stale stored values.
        // See toolConfigStorage.js / useToolParams.js.
        if (isNonLocal) {
          mergeStoredToolConfig(userId, params);
        }

        const scopedKey = [
          TOOLS_QUERY_KEYS.TOOL_PARAMS,
          tool,
          project,
          scenarioName,
          childScenarioToken(childScenario),
        ];

        // The backend now returns the rebuilt tool state directly (same shape as
        // GET /tools/{tool}), so adopt it straight into the cache instead of a
        // separate refetch -- one request instead of two. An older backend that
        // doesn't know about this yet still returns the legacy 'Success' string;
        // fall back to a refetch in that case rather than caching a bare string.
        if (isToolProperties(response.data)) {
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

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';
import useFormReset from './useFormReset';
import { TOOLS_QUERY_KEYS } from '../constants/queryKeys';
import { useIsNonLocalMode, useUserInfo } from 'stores/useUserQuery';
import {
  readStoredToolConfig,
  overlayStoredValues,
} from '../toolConfigStorage';

const useFetchToolParams = (script, scenarioContext) => {
  const { project, scenarioName, childScenario } = scenarioContext;
  const childToken = childScenarioToken(childScenario);

  const isNonLocal = useIsNonLocalMode();
  const userId = useUserInfo()?.id;

  // Non-local backend config is stateless (save-config is a no-op), so saved
  // values live client-side - overlay them onto the defaults the backend
  // returned. See toolConfigStorage.js. Applied via `select` rather than
  // baked into `queryFn`/`queryKey`: `isNonLocal`/`userId` decide how to
  // decorate the fetched resource for the current viewer, they aren't part
  // of the resource's identity, so they shouldn't fragment the cache or
  // trigger a refetch when they change.
  const selectParams = useCallback(
    (data) =>
      isNonLocal
        ? overlayStoredValues(data, readStoredToolConfig(userId))
        : data,
    [isNonLocal, userId],
  );

  return useQuery({
    queryKey: [
      TOOLS_QUERY_KEYS.TOOL_PARAMS,
      script,
      project,
      scenarioName,
      childToken,
    ],
    queryFn: async () => {
      if (!script) return null;
      // In demo mode, GET /api/tools/{script} deliberately returns empty
      // `parameters`/`categorical_parameters` (backend never resolves real
      // values for anonymous callers) - the form renders with no fields
      // rather than real read-only values. Write routes (save-config,
      // validate-field, check) stay excluded entirely.
      const response = await getScenarioClient().get(`/api/tools/${script}`, {
        headers: scenarioHeaders({ project, scenarioName, childScenario }),
      });
      return response.data;
    },
    select: selectParams,
    enabled: !!script,
    staleTime: 5 * 60 * 1000,
  });
};

const useToolParams = (script, form, scenarioContext) => {
  const {
    data: params,
    isLoading,
    isFetching,
    error: fetchError,
    dataUpdatedAt,
  } = useFetchToolParams(script, scenarioContext);

  const resetForm = useFormReset(form, params, script, dataUpdatedAt);

  return {
    params,
    isLoading,
    isFetching,
    fetchError,
    dataUpdatedAt,
    resetForm,
  };
};

export default useToolParams;

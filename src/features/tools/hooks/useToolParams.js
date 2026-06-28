import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { activeScenarioHeaders, childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';
import useFormReset from './useFormReset';
import useInputValidation from './useInputValidation';
import { TOOLS_QUERY_KEYS } from '../constants/queryKeys';
import { useProjectStore } from 'features/project/stores/projectStore';

const useFetchToolParams = (script, scenarioOverride = null) => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);

  const effectiveProject = scenarioOverride?.project || project;
  const effectiveScenarioName = scenarioOverride?.scenarioName || scenarioName;
  const childToken = scenarioOverride ? null : childScenarioToken(childScenario);

  return useQuery({
    queryKey: [
      TOOLS_QUERY_KEYS.TOOL_PARAMS,
      script,
      effectiveProject,
      effectiveScenarioName,
      childToken,
    ],
    queryFn: async () => {
      if (!script) return null;
      const requestConfig = scenarioOverride
        ? {
            headers: scenarioHeaders({
              project: effectiveProject,
              scenarioName: effectiveScenarioName,
            }),
          }
        : { headers: activeScenarioHeaders() };
      const response = await apiClient.get(`/api/tools/${script}`, requestConfig);
      return response.data;
    },
    enabled: !!script,
    staleTime: 5 * 60 * 1000,
  });
};

const useToolParams = (script, form, onError, onParametersChange, scenarioOverride = null) => {
  const {
    data: params,
    isLoading,
    isFetching,
    error: fetchError,
    dataUpdatedAt,
  } = useFetchToolParams(script, scenarioOverride);

  const parameters = useMemo(() => params?.parameters, [params]);
  const categoricalParameters = useMemo(
    () => params?.categorical_parameters,
    [params],
  );

  useEffect(() => {
    if (onParametersChange) {
      onParametersChange?.({ parameters, categoricalParameters });
    }
  }, [dataUpdatedAt, onParametersChange]);

  const resetForm = useFormReset(form, params, script, dataUpdatedAt);

  const { inputError, recheckInputs } = useInputValidation(
    script,
    parameters,
    categoricalParameters,
    form,
    onError,
    dataUpdatedAt,
    scenarioOverride,
  );

  return {
    params,
    isLoading,
    isFetching,
    fetchError,
    inputError,
    resetForm,
    recheckInputs,
  };
};

export default useToolParams;

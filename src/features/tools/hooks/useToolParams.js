import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import useFormReset from './useFormReset';
import useInputValidation from './useInputValidation';
import { TOOLS_QUERY_KEYS } from '../constants/queryKeys';
import { useProjectStore } from 'features/project/stores/projectStore';

const useFetchToolParams = (script) => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);

  return useQuery({
    queryKey: [TOOLS_QUERY_KEYS.TOOL_PARAMS, script, project, scenarioName],
    queryFn: async () => {
      if (!script) return null;
      const response = await apiClient.get(`/api/tools/${script}`, {
        params: { project, scenario_name: scenarioName },
      });
      return response.data;
    },
    enabled: !!script,
    staleTime: 5 * 60 * 1000,
  });
};

const useToolParams = (script, form, onError, onParametersChange) => {
  const {
    data: params,
    isLoading,
    isFetching,
    error: fetchError,
    dataUpdatedAt,
  } = useFetchToolParams(script);

  // Memoize parameters to avoid creating new objects on every render
  const parameters = useMemo(() => params?.parameters, [params]);
  const categoricalParameters = useMemo(
    () => params?.categorical_parameters,
    [params],
  );

  // Call onParametersChange whenever parameters or inputError change
  useEffect(() => {
    if (onParametersChange) {
      onParametersChange?.({ parameters, categoricalParameters });
    }
  }, [dataUpdatedAt, onParametersChange]);

  const resetForm = useFormReset(form, params, script, dataUpdatedAt);

  const { inputError, inputWarnings, recheckInputs } = useInputValidation(
    script,
    parameters,
    categoricalParameters,
    form,
    onError,
    dataUpdatedAt,
  );

  return {
    params,
    isLoading,
    isFetching,
    fetchError,
    inputError,
    inputWarnings,
    resetForm,
    recheckInputs,
  };
};

export default useToolParams;

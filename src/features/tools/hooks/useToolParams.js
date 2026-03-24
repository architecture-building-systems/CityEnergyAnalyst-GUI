import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { useCheckInputsMutation } from './mutations';
import { getFormValues } from '../utils';
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
  const [inputError, setInputError] = useState(undefined);

  // Fetch tool parameters
  const {
    data: params,
    isLoading,
    isFetching,
    error: fetchError,
    dataUpdatedAt,
  } = useFetchToolParams(script);

  const { mutateAsync: checkInputs } = useCheckInputsMutation();

  const parameters = params?.parameters;
  const categoricalParameters = params?.categorical_parameters;

  // Reset form when script or parameters change
  useEffect(() => {
    // Preserve BuildingsParameter values since backend returns them as empty
    const buildingValues = {};
    const collectBuildingValues = (paramList) => {
      for (const p of paramList || []) {
        if (p.type === 'BuildingsParameter') {
          const val = form.getFieldValue(p.name);
          if (val != null) buildingValues[p.name] = val;
        }
      }
    };
    collectBuildingValues(parameters);
    for (const category of Object.values(categoricalParameters || {})) {
      collectBuildingValues(category);
    }

    form.resetFields();

    if (Object.keys(buildingValues).length > 0) {
      form.setFieldsValue(buildingValues);
    }
  }, [script, form, dataUpdatedAt, parameters, categoricalParameters]);

  // Call onParametersChange whenever parameters or inputError change
  useEffect(() => {
    if (onParametersChange) {
      onParametersChange?.({ parameters, categoricalParameters });
    }
  }, [dataUpdatedAt, onParametersChange]);

  const runCheck = useCallback(
    async (cancelled = { value: false }) => {
      if (!script || !parameters) return;

      setInputError(undefined);

      const formParams = await getFormValues(
        form,
        parameters,
        categoricalParameters,
        onError,
      );

      try {
        if (!cancelled.value && formParams) {
          await checkInputs({ tool: script, parameters: formParams });
          if (!cancelled.value) setInputError(null);
        }
      } catch (err) {
        if (!cancelled.value) {
          const message =
            err.response?.data?.detail ||
            err.response?.statusText ||
            err.message ||
            'Unexpected error';
          setInputError(message);
        }
      }
    },
    [script, form, parameters, categoricalParameters, checkInputs, onError],
  );

  // Check inputs whenever parameters change, i.e. save, reset, or refetch
  useEffect(() => {
    const cancelled = { value: false };
    runCheck(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [runCheck, dataUpdatedAt]);

  const recheckInputs = useCallback(() => {
    runCheck({ value: false });
  }, [runCheck]);

  return {
    params,
    isLoading,
    isFetching,
    fetchError,
    inputError,
    recheckInputs,
  };
};

export default useToolParams;

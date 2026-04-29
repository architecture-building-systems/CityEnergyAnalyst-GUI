import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import useFormReset from './useFormReset';
import useInputValidation from './useInputValidation';
import { TOOLS_QUERY_KEYS } from '../constants/queryKeys';
import { useProjectStore } from 'features/project/stores/projectStore';

/**
 * Optional scenario override consumed by `useFetchToolParams`.
 * A `{ project, scenarioName }` value installed via this
 * context replaces the values normally read from
 * `useProjectStore`, so a tool form can fetch its parameter
 * schema against a *different* scenario than the one currently
 * active in the project store.
 *
 * Used by the Canvas Builder's compare mode: when the user
 * clicks Edit on a plot in a non-origin column, the modal wraps
 * the form in this provider with the column's project /
 * scenario, so the form's choice generators (what-if names,
 * building lists, etc.) load from that column's scenario folder
 * rather than whichever scenario the project is currently
 * pointed at.
 *
 * Default value is `null` — most call sites need no override and
 * fall through to `useProjectStore`.
 */
export const ToolScenarioOverrideContext = createContext(null);

const useFetchToolParams = (script) => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const override = useContext(ToolScenarioOverrideContext);
  const effectiveProject = override?.project || project;
  const effectiveScenarioName = override?.scenarioName || scenarioName;

  return useQuery({
    queryKey: [
      TOOLS_QUERY_KEYS.TOOL_PARAMS,
      script,
      effectiveProject,
      effectiveScenarioName,
    ],
    queryFn: async () => {
      if (!script) return null;
      const response = await apiClient.get(`/api/tools/${script}`, {
        params: {
          project: effectiveProject,
          scenario_name: effectiveScenarioName,
        },
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

  const { inputError, recheckInputs } = useInputValidation(
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
    resetForm,
    recheckInputs,
  };
};

export default useToolParams;

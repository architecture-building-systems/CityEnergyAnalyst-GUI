import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { useCheckInputsMutation } from './mutations';
import { getFormValues } from '../utils';
import { TOOLS_QUERY_KEYS } from '../constants/queryKeys';

const useFetchToolParams = (script) => {
  return useQuery({
    queryKey: [TOOLS_QUERY_KEYS.TOOL_PARAMS, script],
    queryFn: async () => {
      if (!script) return null;
      const response = await apiClient.get(`/api/tools/${script}`);
      return response.data;
    },
    enabled: !!script,
    staleTime: 5 * 60 * 1000,
  });
};

const useToolParams = (script, form) => {
  const [inputError, setInputError] = useState(undefined);

  // Fetch tool parameters
  const {
    data: params,
    isLoading,
    isFetching,
    error: fetchError,
  } = useFetchToolParams(script);

  const { mutateAsync: checkInputs } = useCheckInputsMutation();

  const parameters = params?.parameters;
  const categoricalParameters = params?.categorical_parameters;

  // Reset form when script or parameters change
  useEffect(() => {
    form.resetFields();
  }, [script, form, parameters]);

  // Check inputs whenever parameters change
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!script || !parameters) return;

      // Reset error state when checking starts
      setInputError(undefined);

      try {
        const formParams = await getFormValues(
          form,
          parameters,
          categoricalParameters,
        );
        if (!cancelled && formParams) {
          await checkInputs({ tool: script, parameters: formParams });
          if (!cancelled) setInputError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err.response?.data?.detail ||
            err.response?.statusText ||
            err.message ||
            'Unexpected error';
          setInputError(message);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [script, form, parameters, categoricalParameters, checkInputs]);

  return {
    params,
    isLoading,
    isFetching,
    fetchError,
    inputError,
  };
};

export default useToolParams;

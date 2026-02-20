import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { useCheckInputsMutation } from './mutations';
import { getFormValues } from '../utils';
import { TOOLS_QUERY_KEYS } from '../constants/queryKeys';

export const useFetchToolParams = (script) => {
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

const useToolParams = (script, form, parameters, categoricalParameters) => {
  const queryClient = useQueryClient();
  const { mutate: checkInputs } = useCheckInputsMutation();

  useEffect(() => {
    form.resetFields();
    queryClient.setQueryData([TOOLS_QUERY_KEYS.TOOL_PARAMS, script], (old) =>
      old ? { ...old, inputError: undefined } : old,
    );
  }, [script, form, queryClient]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!script || !parameters) return;

      const params = await getFormValues(
        form,
        parameters,
        categoricalParameters,
      );
      if (!cancelled && params) {
        checkInputs({ tool: script, parameters: params });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [script, form, parameters, categoricalParameters, checkInputs]);
};

export default useToolParams;

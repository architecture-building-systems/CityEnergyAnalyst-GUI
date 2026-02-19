import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { useCheckInputs } from 'features/tools/stores/checkInputsStore';
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

const useToolParams = (script, form, parameters, categoricalParameters) => {
  const { checkInputs, resetInputs } = useCheckInputs();

  useEffect(() => {
    let cancelled = false;

    // Reset form and missing inputs state on any dependency change
    form.resetFields();
    resetInputs();

    const run = async () => {
      if (!script || !parameters) return;

      const params = await getFormValues(
        form,
        parameters,
        categoricalParameters,
      );
      if (!cancelled && params) checkInputs(script, params);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    script,
    form,
    parameters,
    categoricalParameters,
    checkInputs,
    resetInputs,
  ]);
};

export default useToolParams;

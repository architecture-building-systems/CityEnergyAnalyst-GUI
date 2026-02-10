import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import {
  useCheckMissingInputs,
  useResetMissingInputs,
} from 'features/tools/stores/toolsStore';
import { getFormValues } from '../utils';

export const useFetchToolParams = (script) => {
  return useQuery({
    queryKey: ['toolParams', script],
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
  const resetMissingInputs = useResetMissingInputs();
  const checkMissingInputs = useCheckMissingInputs();

  useEffect(() => {
    let cancelled = false;

    // Reset form and missing inputs state on any dependency change
    form.resetFields();
    resetMissingInputs();

    const checkInputs = async () => {
      if (!script || !parameters) return;

      const params = await getFormValues(
        form,
        parameters,
        categoricalParameters,
      );
      if (!cancelled && params) checkMissingInputs(script, params);
    };

    checkInputs();

    return () => {
      cancelled = true;
    };
  }, [
    script,
    form,
    parameters,
    categoricalParameters,
    checkMissingInputs,
    resetMissingInputs,
  ]);
};

export default useToolParams;

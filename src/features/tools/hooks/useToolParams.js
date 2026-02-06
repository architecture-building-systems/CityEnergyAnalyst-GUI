import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { useCheckMissingInputs } from 'features/tools/stores/toolsStore';
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
  const checkMissingInputs = useCheckMissingInputs();

  useEffect(() => {
    const checkInputs = async () => {
      if (!script || !parameters) return;

      // Reset form fields to ensure they are in sync with the fetched parameters
      form.resetFields();

      // Check for missing inputs after fetching parameters
      const params = await getFormValues(
        form,
        parameters,
        categoricalParameters,
      );
      if (params) checkMissingInputs(script, params);
    };

    checkInputs();
  }, [script, form, parameters, categoricalParameters, checkMissingInputs]);
};

export default useToolParams;

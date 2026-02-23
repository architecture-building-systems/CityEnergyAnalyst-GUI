import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { TOOLS_QUERY_KEYS, TOOLS_MUTATION_KEYS } from '../constants/queryKeys';

const useParameterMetadataRefetch = (script, form) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.REFETCH_PARAMETER_METADATA],
    mutationFn: async ({ formValues, affectedParams }) => {
      let response;
      try {
        response = await apiClient.post(
          `/api/tools/${script}/parameter-metadata`,
          {
            form_values: formValues,
            affected_parameters: affectedParams,
          },
        );
      } catch (err) {
        const error = new Error(err.message);
        error.response = {
          status: err.response?.status,
          data: err.response?.data,
          statusText: err.response?.statusText,
        };
        throw error;
      }

      const { parameters: updatedMetadata } = response.data;

      // Update cache
      queryClient.setQueryData(
        [TOOLS_QUERY_KEYS.TOOL_PARAMS, script],
        (oldData) => {
          if (!oldData) return oldData;

          const newParameters = [...(oldData.parameters || [])];
          const newCategoricalParameters = {
            ...(oldData.categorical_parameters || {}),
          };

          Object.keys(updatedMetadata).forEach((paramName) => {
            const metadata = updatedMetadata[paramName];

            const paramIndex = newParameters.findIndex(
              (p) => p.name === paramName,
            );
            if (paramIndex >= 0) {
              newParameters[paramIndex] = {
                ...newParameters[paramIndex],
                ...metadata,
              };
            }

            Object.keys(newCategoricalParameters).forEach((category) => {
              const catParamIndex = newCategoricalParameters[
                category
              ].findIndex((p) => p.name === paramName);
              if (catParamIndex >= 0) {
                const cloned = [...newCategoricalParameters[category]];
                cloned[catParamIndex] = {
                  ...cloned[catParamIndex],
                  ...metadata,
                };
                newCategoricalParameters[category] = cloned;
              }
            });
          });

          return {
            ...oldData,
            parameters: newParameters,
            categorical_parameters: newCategoricalParameters,
          };
        },
      );

      // Update form values
      Object.keys(updatedMetadata).forEach((paramName) => {
        const metadata = updatedMetadata[paramName];
        if (metadata.value !== undefined) {
          const currentValue = form.getFieldValue(paramName);
          if (currentValue !== metadata.value) {
            form.setFieldValue(paramName, metadata.value);
          }
        }
      });
    },
    onError: (err) => {
      console.error('Error refetching parameter metadata:', err);
    },
  });
};

export default useParameterMetadataRefetch;
